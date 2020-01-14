const { db }  = require('../util/admin');

exports.getAllScreams = (request, response) => {

    db.collection("screams").orderBy('createdAt', 'desc').get().then(data => {

        let screams = [];
        data.forEach(doc => {
            screams.push({
                screamId: doc.id,
                body: doc.data().body,
                userHandle: doc.data().userHandle,
                createdAt: doc.data().createdAt
            });
        })
        return response.json(screams);
    }).catch(err => console.error(err));
};

exports.likeScream = (req, res) => {

    const likeDocument = db.collection('likes').where('userHandle', '==', req.user.handle)
        .where('screamId', '==', req.params.screamId).limit(1);

    const screamDocument = db.doc('/screams/${req.params.screamId}');

    let screamData = {};
    screamDocument.get()
        .then(doc => {
            if (!doc.exists) {
                screamData = doc.data();
                screamData.screamId = doc.id;
                return likeDocument.get();
            } else {
                return res.status(404).json({ error: 'scream not found' });
            }
        })
        .then(data => {
            if (data.empty) {
                return db.collection('likes').add({
                    screamId: req.params.screamId,
                    userHandle: req.user.handle
                })
                .then(() => {
                    screamData.likeCount++;
                    return screamDocument.update({ likeCount: screamData.likeCount });
                })
                .then(() => {
                    return res.json(screamData);
                })
            } else {
                return res.status(400).json({ error: 'This scream is already liked' })
            }
        })
        .catch(err => {
            console.error(err);
            res.status(500).json({error: err.code})
        })
};
//03.08
exports.unlikeScream = (req, res) => {

    const likeDocument = db.collection('likes').where('userHandle', '==', req.user.handle)
    .where('screamId', '==', req.params.screamId).limit(1);

const screamDocument = db.doc('/screams/${req.params.screamId}');

let screamData = {};
screamDocument.get()
    .then(doc => {
        if (!doc.exists) {
            screamData = doc.data();
            screamData.screamId = doc.id;
            return likeDocument.get();
        } else {
            return res.status(404).json({ error: 'scream not found' });
        }
    })
    .then(data => {
        if (data.empty) {
            return res.status(400).json({ error: 'Scream not liked' });
        } else {
            return db.doc(`/likes/${data.docs[0].id}`).delete()
            .then(() => {
                screamData.likeCount--;
                return screamDocument.update({ likeCount: screamData.likeCount });
            })
            .then(() => {
                res.json(screamData);
            })
        }
    })
    .catch(err => {
        console.error(err);
        res.status(500).json({error: err.code})
    })
};


exports.postOneScream = (request, response) => {

    if (request.body.body.trim() === '') {
        return response.status(400).json({ body: 'Body must not be empty' })
    }

    const newScream = {
        body: request.body.body,
        userHandle: request.user.handle,
        userImage: req.user.imageUrl,
        createdAt: new Date().toISOString(),
        likeCount: 0,
        commentCount: 0
    };

    db.collection('screams').add(newScream).then(doc => {
        const resScream = newScream;
        resScream.screamId = doc.id;
        response.json(resScream)
    })
    .catch(err => {
        response.status(500).json({ error: 'something went wrong' });
        console.error(err);
    });
};


exports.getScream = (req, res) => {

    let screamData = {};

    console.log('get scream started');
    console.log(req.params.screamId);

    db.doc(`/screams/${req.params.screamId}`).get()
        .then(doc => {
            if (!doc.exists) {
                return res.status(404).json({ error: 'Scream not found' })
            }
            screamData = doc.data();
            screamData.screamId = doc.id;

            console.log('then block');

            return db
                .collection('comments')
                .orderBy('createdAt', 'desc')
                .where('screamId', '==', req.params.screamId)
                .get();
        })
        .then((data) => {
            console.log('logging data');
            console.log(data);
            screamData.comments = [];
            data.forEach((doc) => {
                console.log('for each');
                console.log(doc.data());
                screamData.comments.push(doc.data())
            });
            return res.json(screamData);
        })
        .catch(err => {
            console.error(err);
            res.status(500).json({error: err.code});
        })
};

exports.commentOnScream = (req, res) => {
    if (req.body.body.trim() === '') return res.status(400).json({ error: 'Must not be empty' });

    const newComment = {
        body: req.body.body,
        createdAt: new Date().toISOString(),
        screamId: req.params.screamId,
        userHandle: req.user.handle,
        userImage: req.user.imageUrl
    };
    db.doc(`/scream/${req.params.screamId}`).get()
    .then(doc => {
        if(!doc.exists){
            return res.status(404).json({ erorr: 'scream not found' })
        }
        return doc.ref.update({ commentCount: doc.data().commentCount +1 });
    })
    .then(() => {
        return db.collection('comments').add(newComment);
    })
    .then(() => {
        res.json(newComment)
    })
    .catch(err => {
        console.log(err)
        res.status(500).json({error: 'something went wrong' });
    })
}


exports.deleteScream = (req, res) => {
    const document = db.doc('/screams/${req.params.screamId}');
    document.get()
    .then(doc => {
        if (!doc.exists) {
            return res.status(404).json({ error: 'scream not found'});
        }
        if (doc.data().userHandle != req.user.handle) {
            return res.status(403).json({error: 'unauthorized'})
        }
        else {
            return document.delete();
        }
    })
    .then(() => {
        res.json({message: 'scream deleted successfully'})
    })
    .catch(err => {
        console.error(err)
        return res.status(500).json({ error: err.code });
    })
}






