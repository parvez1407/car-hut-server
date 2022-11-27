const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
        const categoriesCollection = client.db('carHut').collection('categories');
        const productsCollection = client.db('carHut').collection('products');
        const bookingsCollection = client.db('carHut').collection('bookings');
        const wishlistsCollection = client.db('carHut').collection('wishlists');

        // user collection api
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updatedDoc = {
                $set: user,
            }
            const result = await usersCollections.updateOne(filter, updatedDoc, options);
            res.send(result);
        })
        // Admin api for dashboard 
        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await usersCollections.findOne(query);
            res.send({ isAdmin: user?.role === 'admin' });
        })
        // Admin api for dashboard 
        app.get('/users/seller/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await usersCollections.findOne(query);
            res.send({ isSeller: user?.role === 'seller' });
        })
        // get sellers and buyers
        app.get('/sellers', async (req, res) => {
            const result = await usersCollections.find({ role: 'seller' }).toArray();
            res.send(result)
        })
        // get buyers and buyers
        app.get('/buyers', async (req, res) => {
            const result = await usersCollections.find({ role: 'buyer' }).toArray();
            res.send(result)
        })
        // product categories
        app.get('/categories', async (req, res) => {
            const query = {};
            const result = await categoriesCollection.find(query).toArray();
            res.send(result);
        })
        // post product objects to database
        app.post('/products', async (req, res) => {
            const product = req.body;
            const result = await productsCollection.insertOne(product);
            res.send(result);
        })
        // get products by its category
        app.get('/category/:id', async (req, res) => {
            const id = req.params.id;
            const query = { category_id: id }
            const categoryProduct = await productsCollection.find(query).toArray();
            res.send(categoryProduct);
        });
        // get specific product collection of seller
        app.get('/myproducts/:email', async (req, res) => {
            const email = req.params.email;
            const query = { sellerEmail: email }
            const result = await productsCollection.find(query).toArray();
            res.send(result);
        })

        // post bookings collection
        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            const result = await bookingsCollection.insertOne(booking);
            res.send(result);
        })

        // get bookings data by email for specific buyer
        app.get('/bookings/:email', async (req, res) => {
            const email = req.params.email;
            const query = { buyerEmail: email };
            const result = await bookingsCollection.find(query).toArray();
            res.send(result);
        })
        // post wishlist collection
        app.post('/wishlists', async (req, res) => {
            const wishlist = req.body;
            const result = await wishlistsCollection.insertOne(wishlist);
            res.send(result);
        })
        // get wishlist data by email for specific buyer
        app.get('/wishlists/:email', async (req, res) => {
            const email = req.params.email;
            const query = { buyerEmail: email };
            const result = await wishlistsCollection.find(query).toArray();
            res.send(result);
        })


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