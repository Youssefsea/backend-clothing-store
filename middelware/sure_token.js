const jwt = require('jsonwebtoken');

const sureToken = (req, res, next) => {
  try {
    const token = req.cookies?.token; 

    if (!token) {
      return res.status(401).send({ message: 'No token provided' });
    }

    const user = jwt.verify(token, process.env.JWT_SECRET);
    req.user = user;
    console.log("sure",req.user.role);
   
    next();
  } catch (err) {
    return res.status(401).send({ message: 'Invalid or expired token' });
  }
};



const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).send({
      body: req.body,
      message: 'Validation error',
      details: error.details.map((d) => d.message),
    });
  }
  next();
};

const verifyRole=(req,res,next)=>{
  const user=req.user;
  console.log(user.role);
  if(user.role!=='admin'){
    return res.status(403).send({message:'Unauthorized'});
  }
  next();
};

module.exports={sureToken,validate,verifyRole};
