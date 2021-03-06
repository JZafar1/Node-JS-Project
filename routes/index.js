const express = require('express');
const router = express.Router();

var mongodb = require('mongodb');

const users = require('../controllers/users');
const stories = require('../controllers/stories');
const initDB = require('../controllers/init');


const rankedStories = require('../recommendation/recommendStories');
initDB.init();

var Story = require('../models/stories');

var fs = require('fs');


/* GET home page. */
router.get('/', function(req, res, next) {
    if (!req.session.loggedIn) {
        return res.redirect('/login');
    }
    res.render('index');
    stories.getAll(req, res, function (error, stories) {
        if (error || !stories) {
                const message = 'No stories in db.';
                console.log(message);
                const err = new Error(message);
                return next(err);
        }
        res.io.on('connection', function() {
            //Reverse stories to enssure they are in date order
            res.io.sockets.emit('broadcast', stories.reverse());
        });

        res.io.on('connection', function(socket) {
            // listen for request to change order of stories
            socket.on('reformatStories', function (data) {
                if(data === 'date') {
                    res.io.sockets.emit('broadcast', stories.reverse());
                } else {
                    // Get sorted stories and wait for a response
                    (async () => {
                        const allStories = await rankedStories.getSortedStories(req.session.user._id);
                        res.io.sockets.emit('broadcast', stories);
                    })();
                }
            });
        });
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
        return res.redirect('/');
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
        console.log(user);
        req.session.loggedIn = true;
        req.session.user = user;
        res.setHeader("Content-Type", "application/json");
        res.send(JSON.stringify({redirect: '/'}));
        // res.redirect() didnt work for me no idea why
    });
});

router.get('/logout', function(req, res, next) {
    req.session.loggedIn = false;
    req.session.user = undefined;
    return res.redirect('/login');
});

router.post('/uploadUser', function (req, res, next) {
    users.insertFromJson(req, res, function (error, results) {
        if (error || !results) {
            console.log(error)
            const err = new Error(error);
            return next(err);
        }
        res.sendStatus(200);
    });
});

router.post('/uploadStory', function (req, res, next) {
    stories.insertFromJson(req, res, function (error, results) {
        if (error || !results) {
            console.log(error)
            const err = new Error(error);
            return next(err);
        }
        res.sendStatus(200);
    });
});

router.post('/rateStory', function (req, res, next) {
    stories.rateStory(req, res, function (error, results) {
        if (error || !results) {
            console.log(error)
            const err = new Error(error);
            return next(err);
        }
        const response = {rating: {userId: req.session.user._id, storyId: req.body.storyId, rating: req.body.rating}}
        res.setHeader("Content-Type", "application/json");
        res.send(JSON.stringify(response));
    });
});

router.post('/transferVotes', function (req, res, next) {
    users.getRatings(req, res, function (error, results) {
        if (error || !results) {
            console.log(error)
            const err = new Error(error);
            return next(err);
        }
        req.body = results;
        stories.rateStories(req, res, function (error, results) {
            if (error || !results) {
                console.log(error)
                const err = new Error(error);
                return next(err);
            }
            res.send(200);
        });
    });
});

router.post('/getStories', function(req, res) {
    const url = 'mongodb://localhost:27017/';
    mongodb.connect(url, function (error, client) {
        if (error) {
            console.log("Database error: ", error);
            res.send(error);
        } else {
            const db = client.db('myStory');
            const collection = db.collection('stories');
            collection.find({}).toArray(function (error, results) {
                if (error) {
                    console.log("Error retrieving data: ", error);
                    res.send(error);
                } else {
                    res.setHeader("Content-Type", "application/json");
                    res.send(JSON.stringify(results));
                }
            });
        }
    });
});

router.post('/createStory', function (req, res) {
    //Get all possible content of the story
    let storyText = req.body.storyContent,
        image0 = req.body.imageText0,
        image1 = req.body.imageText1,
        image2 = req.body.imageText2,
        images;
    //Check if images actually exist
    if (image0 === "") {
        images = [];
    } else if(image1 === "") {
        images = [image0];
    } else if(image2 === "") {
        images = [image0, image1];
    } else {
        images = [image0, image1, image2]
    }
    var theStory = new Story({
        _id: Math.random().toString(36).substring(7),
        text: storyText,
        image: images,
        user_id: req.session.user._id
    });
    theStory.save(function (error) {
        if (error) {
            console.log("Error ", error.message);
        } else {
            res.redirect('createPost/?disp=true');
        }
    });
});

router.get('/timeline', function(req, res) {
    if (!req.session.loggedIn) {
        return res.redirect('/login');
    }
    let currentUser = req.session.user.first_name + " " + req.session.user.family_name;

    const url = 'mongodb://localhost:27017/';
    mongodb.connect(url, function (error, client) {
        if (error) {
            console.log("Database error: ", error);
            res.send(error);
        } else {
            var db = client.db('myStory'),
                collection = db.collection('stories'),
                userObject = req.session.user._id,
                findStories = collection.find({user_id: userObject});

            findStories.toArray(function (error, results) {
                if (error) {
                    console.log("Error retrieving data: ", error);
                    res.send(error);
                } else {
                    res.render('timeline', {
                        title: 'View your timeline',
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
    let storyID = req.body.storyID,
        newText = req.body.storyText;

    const url = 'mongodb://localhost:27017/';
    mongodb.connect(url, function(err, client) {
        if (err) throw err;

        let db = client.db('myStory'),
            collection = db.collection('stories'),
            selectStory = { _id: storyID },
            update = { $set: {text: newText } };

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


router.post('/deletePost', function (req, res) {
    let postToDelete = req.body.storyID,
        url = 'mongodb://localhost:27017/';
    mongodb.connect(url, function(err, client) {
        if (err) throw err;

        let db = client.db('myStory'),
            collection = db.collection('stories'),
            queryPost = { _id: postToDelete };

        collection.deleteOne(queryPost, function(error, result) {
            try {
                res.redirect('/timeline?deleteID=' + postToDelete + '&removed=true');
            } catch (error) {
                console.log("Error removing story...", error);
            }
            client.close();
        });
    });
});

/**
 * Used to locate and display the shared story
 */
router.get('/share', function (req, res) {
    const url = 'mongodb://localhost:27017/';
    //Get the post info from the URL
    let mongoID = req.query.viewPostID;
    mongodb.connect(url, function (error, client) {
        if (error) {
            console.log("Database error: ", error);
            res.send(error);
        } else {

            let db = client.db('myStory');
            let collection = db.collection('stories');

            collection.find({_id : mongoID}).toArray(function (error, results) {
                if (error) {
                    console.log("Error retrieving data: ", error);
                    res.send(error);
                } else {
                    let userDB = db.collection('users');
                    let newQuery = userDB.find({_id: results[0].user_id});
                    newQuery.toArray(function(err, result) {
                        let author = result[0].first_name + " " + result[0].family_name;
                        res.render('share', {
                            title: 'View Shared Post',
                            theStory: results[0],
                            author: author,
                            req: req
                        });
                    });
                }
            });
        }
    });
});

module.exports = router;
