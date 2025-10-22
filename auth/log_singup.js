const data = require("../Data/data");
const bcrypt = require("bcryptjs");
const { createToken } = require("../middelware/jwt_making");

const signup = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    const EmailOrPhoneFound = "SELECT id FROM users WHERE email = ? OR phone = ?";
    const [existing] = await data.query(EmailOrPhoneFound, [email, phone]);

    if (existing.length > 0) {
      return res.status(409).send({ message: "Email or phone already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await data.query(
      "INSERT INTO users (name, email, password, phone) VALUES (?, ?, ?, ?)",
      [name, email, hashedPassword, phone]
    );

    return res
      .status(201)
      .send({ message: "User created successfully", user: { name, email } });
  } catch (err) {
    console.error("Signup Error:", err);
    return res.status(500).send({ message: "Server error" });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const EmailFound =
      "SELECT id, name, email, role, phone, password FROM users WHERE email = ?";
    const [userInfo] = await data.query(EmailFound, [email]);

    if (userInfo.length === 0) {
      return res.status(404).send({ message: "Invalid email or password" });
    }

    const validPassword = await bcrypt.compare(password, userInfo[0].password);
    if (!validPassword) {
      return res.status(401).send({ message: "Invalid email or password" });
    }

    const token = createToken(userInfo[0]);

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "Lax",
      maxAge: 2 * 60 * 60 * 1000
    });

    return res.status(200).send({
      message: "Login successful",
      user: {
        id: userInfo[0].id,
        name: userInfo[0].name,
        email: userInfo[0].email,
        role: userInfo[0].role,
        phone: userInfo[0].phone,
      },
    });
  } catch (err) {
    console.error("Login Error:", err);
    return res.status(500).send({ message: "Server error" });
  }
};

module.exports = { login, signup };
