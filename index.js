const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();
const port = process.env.PORT || 5000;

const app = express();

// middle ware 
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ktnfrsc.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run() {
    try {
        const usersCollections = client.db('carHut').collection('users');

        // user collection api


    }
    finally {

    }
}
run().catch(err => console.error(err));

app.get('/', async (req, res) => {
    res.send('Car-Hut server is running');
})

app.listen(port, () => {
    console.log(`Car-Hut is running on port ${port}`);
})