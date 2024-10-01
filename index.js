const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();
const port = process.env.PORT || 5000;

// middleware

app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ymyoldm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const shoeCollection = client.db("ecommerce1").collection("shoes");
    const bagCollection = client.db("ecommerce1").collection("bags");
    const blogsCollection = client.db("ecommerce1").collection("blogs");
    const accessoriesCollection = client
      .db("ecommerce1")
      .collection("accessories");

    app.get("/accessories", async (req, res) => {
      let query = {};
      if (req.query?.type) {
        query = { type: req.query.type };
      }
      const cursor = accessoriesCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/accessories/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };

      const result = await accessoriesCollection.findOne(query);

      res.send(result);
    });

    app.get("/bags", async (req, res) => {
      let query = {};
      if (req.query?.type) {
        query = { type: req.query.type };
      }
      const cursor = bagCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/bags/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };

      const result = await bagCollection.findOne(query);

      res.send(result);
    });

    app.get("/shoes", async (req, res) => {
      let query = {};
      if (req.query?.type) {
        query = { type: req.query.type };
      }
      const cursor = shoeCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });
    app.get("/shoes/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };

      const result = await shoeCollection.findOne(query);

      res.send(result);
    });

    app.get("/blogs", async (req, res) => {
      const cursor = blogsCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("server is running");
});

app.listen(port, () => {
  console.log(` server is running on port: ${port}`);
});
