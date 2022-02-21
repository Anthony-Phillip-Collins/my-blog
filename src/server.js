import express, { response } from 'express';
import bodyParser from 'body-parser';
import { MongoClient } from 'mongodb';
import path from 'path';

const app = express();
const dbName = 'my-blog'; // test
const collectionName = 'articles'; // inventory

app.use(express.static(path.join(__dirname, '/build')));
app.use(bodyParser.json());

const withDB = async (operations, res) => {
  try {
    const uri = 'mongodb://localhost:27017';
    const client = await MongoClient.connect(uri, { useNewUrlParser: true });
    const db = client.db(dbName);
    
    await operations(db);
  
    client.close();
  }
  catch(error) {
    res.status(500).json({ message: 'Error connecting to db', error });
  }
}

app.get('/api/articles/:name', async (req, res) => {
  withDB( async (db) => {
    const articleName = req.params.name;
    const articleInfo = await db.collection(collectionName).findOne({ name: articleName });
    res.status(200).json(articleInfo);
  }, res );
});

app.post('/api/articles/', async (req, res) => {
  withDB( async (db) => {
    const articleName = req.body.exclude;
    const collection = db.collection(collectionName);
    const articleInfo = await collection.find({'name': {'$ne' : articleName}}).toArray();
    res.status(200).json(articleInfo);
  }, res );
});

app.post('/api/articles/:name/upvote', async (req, res) => {
  withDB( async (db) => {
    const articleName = req.params.name;
    const articleInfo = await db.collection(collectionName).findOne({ name: articleName });

    await db.collection(collectionName).updateOne({ name: articleName }, {
      '$set' : {
        upvotes: articleInfo.upvotes + 1,
      },
    });

    const updatedArticleInfo = await db.collection(collectionName).findOne({ name: articleName });
    res.status(200).json(updatedArticleInfo);
  }, res );
});

app.post('/api/articles/:name/add-comment', (req, res) => {
  
  withDB( async (db) => {
    const {username, comment} = req.body;
    const articleName = req.params.name;
    const articleInfo = await db.collection(collectionName).findOne({ name: articleName });

    await db.collection(collectionName).updateOne({ name: articleName }, {
      '$set' : {
        comments: articleInfo.comments.concat({ username, comment }),
      },
    });

    const updatedArticleInfo = await db.collection(collectionName).findOne({ name: articleName });
    res.status(200).json(updatedArticleInfo);
  }, res );
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname + '/build/index.html'));
});

app.listen(8000, () => console.log('Listening on port 8000'));