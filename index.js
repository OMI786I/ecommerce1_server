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
app.use(express.urlencoded());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { default: axios } = require("axios");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ymyoldm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

//middlewares

const logger = async (req, res, next) => {
  console.log("called", req.host, req.originalUrl);
  next();
};

const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  console.log("token", token);
  if (!token) {
    return res.status(401).send({ message: " forbidden" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    //error
    if (err) {
      console.log("Token verification error", err);
      return res.status(401).send({ message: "unauthorized" });
    }
    //if token is valid it will be decoded
    console.log("value in the token", decoded);
    req.user = decoded;
    next();
  });
};

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
    const cartCollection = client.db("ecommerce1").collection("cart");
    const reviewCollection = client.db("ecommerce1").collection("review");
    const paymentCollection = client.db("ecommerce1").collection("payment");
    //auth related apis

    const verifyAdmin = async (req, res, next) => {
      const email = req.user.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    app.post("/jwt", logger, async (req, res) => {
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.cookie("token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
      });
      res.send({ success: true });
    });

    app.post("/logout", async (req, res) => {
      const user = req.body;
      console.log("logged out", user);
      res.clearCookie("token", { maxAge: 0 }).send({ success: true });
    });
    //services related apis
    // Review

    app.post("/review", async (req, res) => {
      const review = req.body;
      console.log("review", review);
      const result = await reviewCollection.insertOne(review);
      res.send(result);
    });

    app.get("/review", async (req, res) => {
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }

      const cursor = reviewCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    // cart

    app.post("/cart/check", verifyToken, async (req, res) => {
      const { id, email } = req.body;
      try {
        const existingProducts = await cartCollection.findOne({
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

    app.post("/cart", verifyToken, async (req, res) => {
      const cartList = req.body;
      const result = await cartCollection.insertOne(cartList);
      res.send(result);
    });

    app.delete("/cart/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/cart", verifyToken, async (req, res) => {
      if (req.query.email !== req.user.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      let query = {};

      const email = req.query.email;
      query = { email: email };
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;
      const allItems = await cartCollection.find(query).toArray();

      const totalPrice = allItems.reduce(
        (total, item) => total + item.price * item.quantity,
        0
      );

      const totalItems = await cartCollection.countDocuments(query);

      const items = await cartCollection
        .find(query)
        .skip(skip)
        .limit(limit)
        .toArray();
      res.send({
        totalItems,
        page,
        limit,
        totalPrice,
        items,
      });
    });

    app.get("/cart/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.findOne(query);
      res.send(result);
    });

    app.patch("/cart/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedCart = req.body;

      const cart = {
        $set: {
          quantity: updatedCart.quantity,
        },
      };

      const result = await cartCollection.updateOne(filter, cart, options);
      res.send(result);
      console.log(result);
    });

    app.delete("/wishlist/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = { _id: new ObjectId(id) };
      const result = await wishListCollection.deleteOne(query);
      res.send(result);
    });

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

    app.post("/wishlist", logger, async (req, res) => {
      const wishList = req.body;
      console.log(wishList);
      const result = await wishListCollection.insertOne(wishList);
      res.send(result);
    });

    app.get("/wishlist", logger, verifyToken, async (req, res) => {
      try {
        if (req.query.email !== req.user.email) {
          return res.status(403).send({ message: "forbidden access" });
        }

        const email = req.query.email;
        const page = parseInt(req.query.page) || 1; //
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const query = { email: email };

        const totalItems = await wishListCollection.countDocuments(query);

        const items = await wishListCollection
          .find(query)
          .skip(skip)
          .limit(limit)
          .toArray();

        res.send({
          totalItems,
          page,
          limit,
          items,
        });
      } catch (error) {
        res.status(500).send({ message: "Internal server error" });
      }
    });

    //products summary
    const getProductSum = async (collection) => {
      const coll = client.db("ecommerce1").collection(collection);
      const cursor = coll.aggregate([
        {
          $group: {
            _id: null,
            counting: {
              $sum: 1,
            },
          },
        },
      ]);
      const result = await cursor.toArray();
      return result[0];
    };

    app.get("/count", async (req, res) => {
      try {
        const shoesCount = await getProductSum("shoes");
        const bagsCount = await getProductSum("bags");
        const accessoriesCount = await getProductSum("accessories");

        const totalProducts =
          shoesCount.counting + bagsCount.counting + accessoriesCount.counting;

        res.json({ totalProducts });
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch product summary" });
      }
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

      const page = parseInt(req.query.page) || 1; //
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;
      let sort = { price: 1 };
      const totalDocuments = await accessoriesCollection.countDocuments(query);
      const order = req.query.sortOrder === "asc" ? 1 : -1;
      sort = { price: order };

      const cursor = accessoriesCollection
        .find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit);
      const result = await cursor.toArray();
      const type = ["wallet", "cosmetic"];
      res.send({ totalDocuments, type, result });
    });
    app.post("/accessories", verifyToken, verifyAdmin, async (req, res) => {
      const newList = req.body;
      const result = accessoriesCollection.insertOne(newList);
      res.send(result);
    });

    app.post("/bags", verifyToken, verifyAdmin, async (req, res) => {
      const newList = req.body;
      const result = bagCollection.insertOne(newList);
      res.send(result);
    });
    app.post("/shoes", verifyToken, verifyAdmin, async (req, res) => {
      const newList = req.body;
      const result = shoeCollection.insertOne(newList);
      res.send(result);
    });

    app.get("/accessories/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };

      const result = await accessoriesCollection.findOne(query);

      res.send(result);
    });

    app.delete(
      "/accessories/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await accessoriesCollection.deleteOne(query);
        res.send(result);
      }
    );

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

      const page = parseInt(req.query.page) || 1; //
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;
      let sort = { price: 1 };
      const totalDocuments = await bagCollection.countDocuments(query);
      const order = req.query.sortOrder === "asc" ? 1 : -1;
      sort = { price: order };

      const cursor = bagCollection
        .find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit);
      const result = await cursor.toArray();
      const type = ["luggage", "briefcases", "stylish"];
      res.send({ totalDocuments, type, result });
    });

    app.get("/bags/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };

      const result = await bagCollection.findOne(query);

      res.send(result);
    });

    app.delete("/bags/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bagCollection.deleteOne(query);
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
      const page = parseInt(req.query.page) || 1; //
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;
      let sort = { price: 1 };
      const totalDocuments = await shoeCollection.countDocuments(query);
      const order = req.query.sortOrder === "asc" ? 1 : -1;
      sort = { price: order };
      const cursor = shoeCollection
        .find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit);
      const type = ["men", "boots", "flip", "casual"];
      const result = await cursor.toArray();
      res.send({ totalDocuments, type, result });
    });
    app.get("/shoes/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };

      const result = await shoeCollection.findOne(query);

      res.send(result);
    });

    app.delete("/shoes/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await shoeCollection.deleteOne(query);
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

    app.get("/user", verifyToken, async (req, res) => {
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }

      const cursor = userCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/user/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };

      const result = await userCollection.findOne(query);

      res.send(result);
    });

    app.patch("/user/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedUser = req.body;

      const user = {
        $set: {
          name: updatedUser.name,
          image: updatedUser.image,
          phone: updatedUser.phone,
          gender: updatedUser.gender,
          dob: updatedUser.dob,
          location: updatedUser.location,
        },
      };

      const result = await userCollection.updateOne(filter, user, options);
      res.send(result);
      console.log(result);
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

    //admin related routes

    // to make a user admin

    app.patch("/user/admin/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: req.body.role,
        },
      };
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    //check whether a user is admin or not

    app.get("/user/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.user.email) {
        return res.status(403).send({ message: "unauthorized access" });
      }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }

      res.send({ admin });
    });

    app.delete("/user/:id", async (req, res) => {
      const id = req.query.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    //payment related apis

    app.post("/create-payment", verifyToken, async (req, res) => {
      const paymentInfo = req.body;
      console.log("payment info", paymentInfo);
      const trxId = new ObjectId().toString();
      const initialData = {
        store_id: `${process.env.STOREID}`,
        store_passwd: `${process.env.STOREPASS}`,
        refer: "5B1F9DE4D82B6",
        acct_no: "CUST_REF_01",
        total_amount: paymentInfo.money,
        currency: "USD",
        tran_id: trxId,
        success_url: "http://localhost:5000/success-payment",
        fail_url: "http://localhost:5000/failure",
        cancel_url: "http://localhost:5000/cancel",
        cus_name: paymentInfo.name,
        cus_email: paymentInfo.email,
        cus_add1: "Dhaka",
        cus_add2: "Dhaka",
        cus_city: "Dhaka",
        cus_state: "Dhaka",
        cus_postcode: "1000",
        cus_country: "Bangladesh",
        cus_phone: "01711111111",
        cus_fax: "01711111111",
        ship_name: "Customer Name",
        ship_add1: "Dhaka",
        ship_add2: "Dhaka",
        ship_city: "Dhaka",
        ship_state: "Dhaka",
        ship_postcode: "1000",
        ship_country: "Bangladesh",
        shipping_method: "NO",
        product_name: "name",
        product_category: "recharge",
        product_profile: "telecom-vertical",
        num_of_item: 1,
        value_a: "ref001_A",
        value_b: "ref002_B",
        value_c: "ref003_C",
        value_d: "ref004_D",
      };
      const response = await axios({
        method: "POST",
        url: "https://sandbox.sslcommerz.com/gwprocess/v4/invoice.php",
        data: initialData,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      const saveData = {
        customer_name: paymentInfo.name,
        customer_email: paymentInfo.email,
        paymentId: trxId,
        amount: paymentInfo.money,
        products: paymentInfo.products,
        location: paymentInfo.location,
        status: "Pending",
        order_stepper: 0,
      };
      const save = await paymentCollection.insertOne(saveData);

      if (save) {
        res.send({
          payment_url: response.data.pay_url,
        });
      }

      console.log(response);
    });

    app.post("/success-payment", async (req, res) => {
      const successData = req.body;

      console.log("successData", successData);
      if (successData.status !== "VALID") {
        throw new Error("Unauthorized payment");
      }

      const query = {
        paymentId: successData.tran_id,
      };

      const paymentRecord = await paymentCollection.findOne({
        paymentId: successData.tran_id,
      });
      const products = paymentRecord.products;
      const query2 = {
        _id: {
          $in: products.map((id) => new ObjectId(id._id)),
        },
      };
      const deleteResult = await cartCollection.deleteMany(query2);
      console.log("products arra", products);

      const update = {
        $set: {
          status: "success",
        },
      };
      const updateData = await paymentCollection.updateOne(query, update);
      res.redirect(`http://localhost:5173/success/${req.body.tran_id}`);
      console.log("updated", updateData, deleteResult);
    });

    app.post("/failure", async (req, res) => {
      const result = await paymentCollection.deleteOne({
        paymentId: req.body.tran_id,
      });

      res.redirect(`http://localhost:5173/cart`);
    });

    app.post("/cancel", async (req, res) => {
      const result = await paymentCollection.deleteOne({
        paymentId: req.body.tran_id,
      });

      res.redirect(`http://localhost:5173/cart`);
    });

    // payment info related apis

    app.get("/order", verifyToken, async (req, res) => {
      let query = {};
      if (req.query?.email) {
        query = {
          customer_email: req.query.email,
        };
      }
      const result = paymentCollection.find(query);
      const final = await result.toArray();
      res.send(final);
    });

    app.get("/order/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await paymentCollection.findOne(query);
      res.send(result);
    });

    //for delete

    app.delete("/order/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await paymentCollection.deleteOne(query);
      res.send(result);
    });

    app.patch("/order/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedBody = req.body;

      const body = {
        $set: {
          order_stepper: updatedBody.order_stepper,
        },
      };

      const result = await paymentCollection.updateOne(query, body, options);
      res.send(result);
    });

    // veryfy token & verify admin for delete
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
