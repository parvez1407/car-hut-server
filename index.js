const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require("stripe")(process.env.STRIPE_SECRET);
const port = process.env.PORT || 5000;

const app = express();

// middle ware 
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ktnfrsc.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'Unauthorized Access' })
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden Access' })
        }
        req.decoded = decoded;
        next()
    })
}




async function run() {
    try {
        const usersCollections = client.db('carHut').collection('users');
        const categoriesCollection = client.db('carHut').collection('categories');
        const productsCollection = client.db('carHut').collection('products');
        const bookingsCollection = client.db('carHut').collection('bookings');
        const wishlistsCollection = client.db('carHut').collection('wishlists');
        const paymentsCollection = client.db('carHut').collection('payments');
        const promotionsCollection = client.db('carHut').collection('promotions');

        // jwt token
        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const user = await usersCollections.findOne(query);
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '7d' });
                return res.send({ accessToken: token });
            }
            res.status(403).send({ accessToken: '' })
        })

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

        // stripe payment
        app.post('/create-payment-intent', async (req, res) => {
            const booking = req.body;
            const price = booking.sealingPrice;
            const amount = price * 100;

            const paymentIntent = await stripe.paymentIntents.create({
                currency: 'usd',
                amount: amount,
                "payment_method_types": [
                    "card"
                ]
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        })


        // payments collection
        app.post('/payments', verifyJWT, async (req, res) => {
            const payment = req.body;
            const result = await paymentsCollection.insertOne(payment);
            const id = payment.bookingId;
            const filter = { _id: ObjectId(id) };
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }
            const updatedResult = await bookingsCollection.updateOne(filter, updatedDoc);
            const updatedProduct = await productsCollection.updateOne({ _id: ObjectId(payment.productId) }, updatedDoc);
            const updatedAdvertise = await promotionsCollection.updateOne({ productId: payment.productId }, updatedDoc);
            res.send(result);
        })
        // seller verification
        app.post('/verification', verifyJWT, async (req, res) => {
            const verification = req.body;
            const email = verification.email;
            const filter = { sellerEmail: email };
            const updatedDoc = {
                $set: {
                    verified: true,
                }
            }
            const updatedProducts = await productsCollection.updateMany(filter, updatedDoc);
            const updatedResult = await usersCollections.updateOne({ email: verification.email }, updatedDoc);

        })

        // get sellers and buyers
        app.get('/sellers', verifyJWT, async (req, res) => {
            const result = await usersCollections.find({ role: 'seller' }).toArray();
            res.send(result)
        })
        // delete single seller
        app.delete('/sellers/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await usersCollections.deleteOne(filter);
            res.send(result);
        })
        // delete single buyers
        app.delete('/buyers/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await usersCollections.deleteOne(filter);
            res.send(result);
        })



        // get buyers and buyers
        app.get('/buyers', verifyJWT, async (req, res) => {
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
        app.post('/products', verifyJWT, async (req, res) => {
            const product = req.body;
            const result = await productsCollection.insertOne(product);
            res.send(result);
        })

        // post advertises collection
        app.post('/promotions', verifyJWT, async (req, res) => {
            const advertise = req.body;
            const result = await promotionsCollection.insertOne(advertise);
            res.send(result);
        })
        // get advertises collection
        app.get('/promotions', async (req, res) => {
            const query = {};
            const result = await promotionsCollection.find(query).toArray();
            res.send(result);
        })

        // delete product by seller
        app.delete('/products/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await productsCollection.deleteOne(filter);
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
        app.get('/myproducts/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const query = { sellerEmail: email }
            const result = await productsCollection.find(query).toArray();
            res.send(result);
        })

        // post bookings collection
        app.post('/bookings', verifyJWT, async (req, res) => {
            const booking = req.body;
            const result = await bookingsCollection.insertOne(booking);
            res.send(result);
        })

        // get bookings data by email for specific buyer
        app.get('/bookings/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const query = { buyerEmail: email };
            const result = await bookingsCollection.find(query).toArray();
            res.send(result);
        })

        // get bookings for payment
        app.get('/booking/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const booking = await bookingsCollection.findOne(query);
            res.send(booking);
        })

        // post wishlist collection
        app.put('/wishlists', verifyJWT, async (req, res) => {
            const wishlist = req.body;
            const result = await wishlistsCollection.insertOne(wishlist);
            res.send(result);
        })
        // get wishlist data by email for specific buyer
        app.get('/wishlists/:email', verifyJWT, async (req, res) => {
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