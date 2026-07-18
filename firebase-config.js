const firebaseConfig={
 apiKey:'AIzaSyCAgRRrJMKe0RBhVJxjeblkark8jnMhbIY',
 authDomain:'smartrisk-cz5-produccion.firebaseapp.com',
 projectId:'smartrisk-cz5-produccion',
 storageBucket:'smartrisk-cz5-produccion.firebasestorage.app',
 messagingSenderId:'381546921226',
 appId:'1:381546921226:web:7b3771120a7582e6f48ef3'
};
firebase.initializeApp(firebaseConfig);
const auth=firebase.auth();
auth.languageCode='es';
