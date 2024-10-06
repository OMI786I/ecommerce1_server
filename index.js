const express = require("express");
const cors = require("cors");
const app = express();
const jwt = require("jsonwebtoken");
require("dotenv").config();
const port = process.env.PORT || 5000;
let cookieParser = require("cookie-parser");
// middleware
app.use(cookieParser());
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
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
    const userCollection = client.db("ecommerce1").collection("user");
    const shoeCollection = client.db("ecommerce1").collection("shoes");
    const bagCollection = client.db("ecommerce1").collection("bags");
    const blogsCollection = client.db("ecommerce1").collection("blogs");
    const accessoriesCollection = client
      .db("ecommerce1")
      .collection("accessories");
    const wishListCollection = client.db("ecommerce1").collection("wishList");

    //auth related apis
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.cookie("token", token, {
        httpOnly: true,
        secure: false,
        samSite: "none",
      });
      res.send({ success: true });
    });
    //services related apis

    //wish list

    app.post("/wishlist/check", async (req, res) => {
      const { id, email } = req.body;

      try {
        const existingProducts = await wishListCollection.findOne({
          id: id,
          email: email,
        });
        if (existingProducts) {
          res.send({ exists: true });
        } else {
          res.send({ exists: false });
        }
      } catch (error) {
        console.error("Error checking user:", error);
        res.status(500).send("Error checking user");
      }
    });

    app.post("/wishlist", async (req, res) => {
      const wishList = req.body;
      console.log(wishList);
      const result = await wishListCollection.insertOne(wishList);
      res.send(result);
    });

    app.get("/wishlist", async (req, res) => {
      const email = req.query.email;
      console.log(req.cookies.token);
      query = { email: email };
      const result = await wishListCollection.find(query).toArray();
      res.send(result);
    });

    //accessories
    app.get("/accessories", async (req, res) => {
      let query = {};
      if (req.query?.type) {
        query = { type: req.query.type };
      }

      if (req.query.minPrice || req.query.maxPrice) {
        query.price = {};
        if (req.query.minPrice) {
          query.price.$gte = parseFloat(req.query.minPrice);
        }
        if (req.query.maxPrice) {
          query.price.$lte = parseFloat(req.query.maxPrice);
        }
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

      if (req.query.minPrice || req.query.maxPrice) {
        query.price = {};
        if (req.query.minPrice) {
          query.price.$gte = parseFloat(req.query.minPrice);
        }
        if (req.query.maxPrice) {
          query.price.$lte = parseFloat(req.query.maxPrice);
        }
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

      if (req.query.minPrice || req.query.maxPrice) {
        query.price = {};
        if (req.query.minPrice) {
          query.price.$gte = parseFloat(req.query.minPrice);
        }
        if (req.query.maxPrice) {
          query.price.$lte = parseFloat(req.query.maxPrice);
        }
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

    //userCollection

    app.post("/user", async (req, res) => {
      const newUser = req.body;
      const result = await userCollection.insertOne(newUser);
      res.send(result);
    });

    app.get("/user", async (req, res) => {
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }

      const cursor = userCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.post("/user/check", async (req, res) => {
      const { email } = req.body;
      try {
        const existingUser = await userCollection.findOne({ email: email });
        if (existingUser) {
          res.send({ exists: true });
        } else {
          res.send({ exists: false });
        }
      } catch (error) {
        console.error("Error checking user:", error);
        res.status(500).send("Error checking user");
      }
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
