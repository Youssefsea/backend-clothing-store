const data=require('../Data/data');


const getAllOrders=async(req,res)=>{
    try{
        const result=await data.query('SELECT * FROM orders');
        const orders = result.rows;
        return res.status(200).send({message:'Orders fetched successfully',orders:orders});
    }catch(err){
        return res.status(500).send({message:'Internal server error'});
    }
}


const getOrderByUserId=async(req,res)=>{
    try{
        const {user_id}=req.body;
        const result=await data.query('SELECT * FROM orders WHERE user_id = $1',[user_id]);
        const orders = result.rows;
        return res.status(200).send({message:'Orders fetched successfully',orders});
    }catch(err){
        return res.status(500).send({message:'Internal server error'});
    }
}

const getOrderByUserEmail=async(req,res)=>
{
    try{
        const {email}=req.body;
        const result=await data.query('SELECT * FROM orders WHERE customer_email = $1',[email]);
        const orders = result.rows;
        return res.status(200).send({message:'Orders fetched successfully',orders});
    }catch(err){
        return res.status(500).send({message:'Internal server error'});
    }
}

const updateOrderStatus = async (req, res) => {
    try {
      const { order_id, status } = req.body;      const result = await data.query('SELECT status FROM orders WHERE id = $1', [order_id]);
      const currentOrder = result.rows;
      if (!currentOrder || currentOrder.length === 0) {
        return res.status(404).send({ message: 'Order not found' });
      }

      const oldStatus = currentOrder[0].status;
  
      if (status === 'cancelled' && oldStatus !== 'cancelled') {
        const itemsResult = await data.query('SELECT product_id, quantity FROM order_items WHERE order_id = $1', [order_id]);
        const items = itemsResult.rows;
  
        for (const item of items) {
          await data.query(
            'UPDATE products SET stock = stock + $1 WHERE id = $2',
            [item.quantity, item.product_id]
          );
        }
      }
  
      else if (oldStatus === 'cancelled' && status !== 'cancelled') {
        const itemsResult = await data.query('SELECT product_id, quantity FROM order_items WHERE order_id = $1', [order_id]);
        const items = itemsResult.rows;
  
        for (const item of items) {
          await data.query(
            'UPDATE products SET stock = stock - $1 WHERE id = $2 AND stock >= $3',
            [item.quantity, item.product_id, item.quantity]
          );
        }
      }
  
      await data.query('UPDATE orders SET status = $1 WHERE id = $2', [status, order_id]);
  
      return res.status(200).send({
        message: `Order status updated to "${status}" successfully`,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).send({ message: 'Internal server error' });
    }
  };
  


const deleteUser=async(req,res)=>{
    try{
        const {user_id}=req.body;
        const result=await data.query('DELETE FROM users WHERE id = $1',[user_id]);
        const user = result.rows;
        return res.status(200).send({message:'User deleted successfully',user});
    }catch(err){
        return res.status(500).send({message:'Internal server error'});
    }
}

const getAllUsers=async(req,res)=>{
    try{
        const result=await data.query('SELECT * FROM users');
        const users = result.rows;
        return res.status(200).send({message:'Users fetched successfully',users:users});
    }catch(err){
        return res.status(500).send({message:'Internal server error'});
    }
}

const getUserByEmail=async(req,res)=>{
    try{
        const {email}=req.body;
        const result=await data.query('SELECT * FROM users WHERE email = $1',[email]);
        const user = result.rows;
        return res.status(200).send({message:'User fetched successfully',user});
    }catch(err){
        return res.status(500).send({message:'Internal server error'});
    }
}

const getUserByPhone=async(req,res)=>{
    try{
        const {phone}=req.body;
        const result=await data.query('SELECT * FROM users WHERE phone = $1',[phone]);
        const user = result.rows;
        return res.status(200).send({message:'User fetched successfully',user});
    }catch(err){
        return res.status(500).send({message:'Internal server error'});
    }
}


const isLoggedIn=async(req,res)=>
    {
        try{
            const user=req.user;
            if(!user){
                return res.status(401).send({message:'Unauthorized'});
            }
            return res.status(200).send({message:'User is logged in',name:user.name,email:user.email});
        }catch(err){
            return res.status(500).send({message:'Internal server error'});
        }
    }


module.exports={getAllOrders,getOrderByUserId,updateOrderStatus,deleteUser,getAllUsers,getUserByEmail,getUserByPhone,getOrderByUserEmail,isLoggedIn};