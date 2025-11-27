const data = require("../Data/data");
const bcrypt = require("bcryptjs");
const { createToken } = require("../middelware/jwt_making");
const crypto = require('crypto');
const NodeCache = require("node-cache");
const {sendEmail}=require('./OTPemail');

const otpCache = new NodeCache({ stdTTL: 60, checkperiod: 10 });

const sendOTPEmail = async(req,res)=>
  {
    try{
const {email,phone}=req.body;
    const result = await data.query(
      "SELECT id FROM users WHERE email = $1 OR phone = $2",
      [email, phone]
    );
    const existing = result.rows;
    if (existing.length > 0) {
      return res.status(409).send({ message: "Email or phone already exists" });
    }        const otp = crypto.randomInt(100000, 999999).toString();
    otpCache.set(email, otp);
        await sendEmail(email, otp);
  return res.status(200).send({ message: "OTP sent to your email" });
  } catch(err){
    console.error("Error in sendOTPEmail:", err);
    return res.status(500).send({ message: "Server error" });
  }
};


const signup = async (req, res) => {
  try {
    const { name, email, password, phone,otp } = req.body;
    const storedOtp = otpCache.get(email);


if (!storedOtp || storedOtp !== otp) {
  return res.status(400).send({ message: "Invalid or expired OTP" });
}

      otpCache.del(email);





    const hashedPassword = await bcrypt.hash(password, 12);

    await data.query(
      "INSERT INTO users (name, email, password, phone) VALUES ($1, $2, $3, $4)",
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
      "SELECT id, name, email, role, phone, password FROM users WHERE email = $1";
    const result = await data.query(EmailFound, [email]);
    const userInfo = result.rows;

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
  sameSite: "None", 
  secure: true, 
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
      token: token
    });
  } catch (err) {
    console.error("Login Error:", err);
    return res.status(500).send({ message: "Server error" });
  }
};



module.exports = { login, signup, sendOTPEmail };
