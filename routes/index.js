const express = require('express');
const router = express.Router();

var mongodb = require('mongodb');

const users = require('../controllers/users');
const initDB = require('../controllers/init');
initDB.init();

var Story = require('../models/stories');


/* GET home page. */
router.get('/', function(req, res, next) {
    if (!req.session.loggedIn) {
        return res.redirect('/login');
    }

    var url = 'mongodb://localhost:27017/';
    mongodb.connect(url, function (error, client) {
        if (error) {
            console.log("Database error: ", error);
            res.send(error);
        } else {
            var db = client.db('myStory');
            var collection = db.collection('stories');

            collection.find({}).toArray(function (error, results) {
                if (error) {
                    console.log("Error retrieving data: ", error);
                    res.send(error);
                } else {
                    for(let i = 0; i < results.length; i++) {
                        var userID = new mongodb.ObjectID(results[i].user_id);
                        var userDB = db.collection('users');
                        var newQuery = userDB.find({_id: userID});
                        newQuery.toArray(function(err, result) {
                            results[i].user_id = result[0].first_name + " " + result[0].family_name;
                        });
                    }
                    res.render('index', {
                        title: 'Index',
                        profileSource: 'https://images.unsplash.com/reserve/bOvf94dPRxWu0u3QsPjF_tree.jpg?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=500&q=60',
                        allStories: results,
                        req: req
                    });
                }
            });
        }
    });
});

router.get('/createPost', function(req, res, next) {
    if (!req.session.loggedIn) {
        return res.redirect('/login');
    }
    res.render('createPost', { title: 'Create New Post', req: req});
});

router.get('/login', function (req, res, next) {
    if (req.session.loggedIn) {
        return res.redirect('/timeline');
    }
    res.render('login', { title: 'Login'});
});

router.post('/login', function(req, res, next) {
    users.authenticate(req, res, function (error, user) {
        if (error || !user) {
            const message = 'Wrong email or password.';
            console.log(message);
            const err = new Error(message);
            return next(err);
        }
        console.log("Login successful");
        req.session.loggedIn = true;
        console.log(user);
        req.session.user = user;
        res.setHeader("Content-Type", "application/json");
        res.send(JSON.stringify({redirect: '/timeline'}));
        // res.redirect() didnt work for me no idea why
    });
});

router.get('/logout', function(req, res, next) {
    req.session.loggedIn = false;
    req.session.user = undefined;
    return res.redirect('/login');
});

router.post('/createStory', function (req, res) {
    //Get all possible content of the story
    var storyText = req.body.storyContent;
    var image0 = req.body.image0;
    var image1 = req.body.image1;
    var image2 = req.body.image2;
    var images;
    //Check if images actually exist
    if(image0 === undefined) {
        images = [];
    }else if(image1 === undefined) {
        images = [image0];
    }else if(image2 === undefined) {
        images = [image0, image1];
    }
    var theStory = new Story({
        text: storyText,
        images: images,
        user_id: req.session.user._id
    });
    theStory.save(function (error, response) {
        if (error) {
            console.log("Error ", error);
            res.status(500).send('Internal Server Error: ', + error);
        } else {
            res.redirect('/createPost/?disp=true');
        }
    });
});

router.get('/timeline', function(req, res) {
    if (!req.session.loggedIn) {
        return res.redirect('/login');
    }
    var currentUser = req.session.user.first_name + " " + req.session.user.family_name;

    var url = 'mongodb://localhost:27017/';
    mongodb.connect(url, function (error, client) {
        if (error) {
            console.log("Database error: ", error);
            res.send(error);
        } else {
            var db = client.db('myStory');
            var collection = db.collection('stories');

            var userObject = new mongodb.ObjectID(req.session.user._id);
            var findStories = collection.find({user_id: userObject});

            findStories.toArray(function (error, results) {
                if (error) {
                    console.log("Error retrieving data: ", error);
                    res.send(error);
                } else {
                    res.render('timeline', {
                        title: 'View your timeline',
                        profileSource: 'https://images.unsplash.com/reserve/bOvf94dPRxWu0u3QsPjF_tree.jpg?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=500&q=60',
                        allStories: results,
                        author: currentUser,
                        req: req
                    });
                }
            });
        }
    });
});

router.post('/editPost', function(req, res) {
    var storyID = req.body.storyID;
    var mongoID = new mongodb.ObjectID(storyID);

    var newText = req.body.storyText;

    var url = 'mongodb://localhost:27017/';
    mongodb.connect(url, function(err, client) {
        if (err) throw err;

        var db = client.db('myStory');
        var collection = db.collection('stories');
        var selectStory = { _id: mongoID };
        var update = { $set: {text: newText } };

        //collection.count({_id: mongoID}, function (err, count) {
        //    console.log("Stoies with ID: " + count);
        //});
        collection.updateOne(selectStory, update, function(error, result) {
            if (error) {
                console.log("Error updating story...", error);
                res.redirect('/timeline?edit=False&error=fatal&postID=' + storyID);
                throw error;
            }else {
                res.redirect('/timeline?edit=True&postID=' + storyID);
            }
        });
        client.close();
    });
});

router.post('/sharePost', function (req, res) {
    var storyID = req.body.storyID;
    var mongoID = new mongodb.ObjectID(storyID);
    console.log("Sharing: " + storyID);
    res.redirect('/timeline?sharePostID=' + storyID);
    //TODO: Implement the share button feature
});

router.post('/deletePost', function (req, res) {
    var postToDelete = req.body.storyID;
    var url = 'mongodb://localhost:27017/';
    mongodb.connect(url, function(err, client) {
        if (err) throw err;

        var db = client.db('myStory');
        var collection = db.collection('stories');

        var mongoID = new mongodb.ObjectID(postToDelete);
        var queryPost = { _id: mongoID };
        collection.deleteOne(queryPost, function(error, result) {
            if (error) {
                console.log("Error removing story...", error);
                throw error;
            }else {
                res.redirect('/timeline?deleteID=' + postToDelete + '&removed=true');
            }
            client.close();
        });
    });
});

module.exports = router;
