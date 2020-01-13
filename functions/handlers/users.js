const { admin, db } = require("../util/admin");
const firebase = require("firebase");
const config = require("../util/config");

firebase.initializeApp(config);

const { validateSignupData, validateLoginData, reduceUserDetails } = require("../util/validators");

exports.signup = (req, res) => {
  const newUser = {
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    handle: req.body.handle
  };

  const { valid, errors } = validateSignupData(newUser);

  if (!valid) return res.status(400).json(errors);

  const noImg = "no-img.png";

  let token, userId;
  db.doc(`/users/${newUser.handle}`)
    .get()
    .then(doc => {
      if (doc.exists) {
        return res.status(400).json({ handle: "this handle is already taken" });
      } else {
        return firebase
          .auth()
          .createUserWithEmailAndPassword(newUser.email, newUser.password);
      }
    })
    .then(data => {
      userId = data.user.uid;
      return data.user.getIdToken();
    })
    .then(idToken => {
      token = idToken;
      const userCredentials = {
        handle: newUser.handle,
        email: newUser.email,
        createdAt: new Date().toISOString(),
        imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImg}?alt=media`,
        userId
      };
      return db.doc(`/users/${newUser.handle}`).set(userCredentials);
    })
    .then(() => {
      return res.status(201).json({ token });
    })
    .catch(err => {
      console.error(err);

      if (err.code === "auth/email-already-in-use") {
        return res.status(400).json({ email: "Email is already in use" });
      } else {
        return res.status(500).json({ error: err.code });
      }
    });
};

exports.login = (req, res) => {
  const user = {
    email: req.body.email,
    password: req.body.password
  };
  const { valid, errors } = validateLoginData(user);
  if (!valid) return res.status(400).json(errors);

  firebase
    .auth()
    .signInWithEmailAndPassword(user.email, user.password)
    .then(data => {
      return data.user.getIdToken();
    })
    .then(token => {
      return res.json({ token });
    })
    .catch(err => {
      console.error(err);
      if (err.code === "auth/wrong-password") {
        return res.status(403).json({ general: "Wrong Credentials" });
      } else return res.status(500).json({ error: err.code });
    });
};


//add user details
exports.addUserDetails = (req, res) => {

  console.log(req.body.bio);
  console.log(req.body.website);
  console.log(req.body.location);

  let userDetails = reduceUserDetails(req.body);

  console.log(userDetails);

  db.doc(`/users/${req.user.handle}`).update(userDetails)
  .then(() => {
    return res.json({ message: 'User details added successfully' })
  })
  .catch(err => {
    console.error(err);
    return res.status(500).json({error: err.code});
  })
}


exports.getAuthenticatedUser = (req, res) => {

  let userData = {};
  db.doc(`/users/${req.user.handle}`).get()
  .then((doc) => {
    if (doc.exists) {
      userData.credentials = doc.data();
      return db.collection('likes').where('userHandle', '==', req.user.handle).get()
    }
  })
  .then(data => {
    userData.likes = [];
    data.forEach((doc) => {
      userData.likes.push(doc.data());
    });
    return res.json(userData);
  })
  .catch(err => {
    console.error(err);
    return res.status(500).json({ error: err.code });
  })
}



exports.uploadImage = (req, res) => {

  console.log('image upload started');
  const BusBoy = require("busboy");
  const path = require("path");
  const os = require("os");
  const fs = require("fs");

  const busboy = new BusBoy({ headers: req.headers });

  let imageFileName;
  let imageToBeUploaded = {};

  //code from docs
//   console.log(String.raw`D:\FAR\Md9jS0Ih.jpg`);

//   const options = {
//     destination: "new-image.png",
//     resumable: true,
//     validation: "crc32c",
//     metadata: {
//       metadata: {
//         event: "Fall trip to the zoo"
//       }
//     }
//   };

//   admin.storage().bucket().upload(String.raw`D:\FAR\Md9jS0Ih.jpg`, options, function(err, file, apiResponse) {
//       console.log("admin.storage started");
//       console.log("Logging error " + err);
//       console.log("Logging file " + file);
//       console.log("Logging api response " + apiResponse);
//       console.log("admin.storage ended");
//     });

  busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
    console.log(fieldname);
    console.log(filename);
    console.log(mimetype);

    const imageExtension = filename.split(".")[filename.split(".").length - 1];
    imageFileName = `${Math.round(Math.random() * 100000000000 )}.${imageExtension}`;
    const filepath = path.join(os.tmpdir(), imageFileName);
    console.log(filepath);
    imageToBeUploaded = { filepath, mimetype };
    file.pipe(fs.createWriteStream(filepath));

    //code from SO answer
    // storageFile = admin.storage().bucket().file(filepath);
    // file.pipe(storageFile.createWriteStream({ gzip: true }));

    // console.log('Logging image file name' + imageFileName);
  });

  busboy.on("finish", () => {
    console.log("Busboy on finish started");

    console.log(admin.storage().bucket());

    //code from SO answer
    // db.doc(`/users/${req.user.handle}`).update({ imagePath: imageToBeUploaded.filepath })
    // .then(() => {
    //     res.status(201).json({ message: 'Image uploaded successfully' }); // 201 CREATED
    // })
    // .catch((err) => {
    //   console.error(err);
    //   res.status(500).json({ error: err.code }); // 500 INTERNAL_SERVER_ERROR
    // });

    // req.pipe(busboy);

    // console.log(imageToBeUploaded.filepath);
    // admin.storage().bucket().upload(JSON.stringify('C:\Users\Office Laptop\AppData\Local\Temp\29031175783.jpg') , function(err, file, apiResponse) {

    //     console.log('Logging error ' + err);
    //     console.log('Logging file ' + file);
    //     console.log('Logging api response ' + apiResponse);
    // });
    // console.log(imageToBeUploaded.filepath);

    //original code from the video tutorial
    admin
      .storage()
      .bucket()
      .upload(imageToBeUploaded.filepath, {
        resumable: false,
        metadata: {
          metadata: {
            contentType: imageToBeUploaded.mimetype
          }
        }
      })
      .then(() => {
        console.log("then block of busboyon");
        const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`;
        console.log("logging image url" + imageUrl);
        return db.doc(`/users/${req.user.handle}`).update({ imageUrl });
      })
      .then(() => {
        return res.json({ message: "Image uploaded successfully" });
      })
      .catch(err => {
        console.log("catch block");
        console.error(err);
        return res.status(500).json({ error: err.code });
      });
  });
  busboy.end(req.rawBody);
};
