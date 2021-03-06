let dbPromise;

const DB_NAME = 'db_my_story_1';
const STORIES_STORE_NAME = 'store_stories';

/**
 * Initialises the database
 */
function initDatabase() {
    dbPromise = idb.openDb(DB_NAME, 1, function (upgradeDb) {
        if (!upgradeDb.objectStoreNames.contains(STORIES_STORE_NAME)) {
            let storiesDB = upgradeDb.createObjectStore(STORIES_STORE_NAME, {keyPath: '_id'});
            storiesDB.createIndex('text', 'text', {unique: false, multiEntry: true});
            storiesDB.createIndex('image', 'image', {unique: false, multiEntry: true});
            storiesDB.createIndex('date', 'date', {unique: false, multiEntry: true});
            storiesDB.createIndex('user_id', 'user_id', {unique: false, multiEntry: true});
            storiesDB.createIndex('votes', 'votes', {unique: false, multiEntry: true});
        }
    });
}

/**
 * Saves stories for a user in indexedDB
 * @param storyObject
 */
function storeCachedData(storyObject) {
    if (dbPromise) {
        dbPromise.then(async db => {
            let tx = db.transaction(STORIES_STORE_NAME, 'readwrite');
            let store = tx.objectStore(STORIES_STORE_NAME);
            await store.put(storyObject);
            // await store.add(storyObject);
            return tx.complete;
        }).then(function () {
        }).catch(function (e) {
            console.log(e);
            localStorage.setItem(storyObject._id, JSON.stringify(storyObject));
        });
    } else {
        localStorage.setItem(storyObject._id, JSON.stringify(storyObject));
    }
}

/**
 * Gets all stored stories from the indexedDB
 */
function getCachedData() {
    if (dbPromise) {
        dbPromise.then(function (db) {
            console.log('fetching stories');
            const tx = db.transaction(STORIES_STORE_NAME, 'readonly');
            const store = tx.objectStore(STORIES_STORE_NAME);
            return store.getAll();
        }).then(function (stories) {
            if (stories.length > 0) {
                for (let story of stories) {
                    if (story != null) {
                        addToResults(story);
                    }
                }
            }
            console.log('Got stories from indexeddb');
        }).catch(function () {
            for (let story of localStorage) {
                if (story != null) {
                    addToResults(story);
                }
            }
        });
    } else {
        for (let story of localStorage) {
            if (story != null) {
                addToResults(story);
            }
        }
    }
}


