const data=require('../Data/data');


const getAllOrders=async(req,res)=>{
    try{
        const orders=await data.query('SELECT * FROM orders');
        return res.status(200).send({message:'Orders fetched successfully',orders:orders[0]});
    }catch(err){
        return res.status(500).send({message:'Internal server error'});
    }
}


const getOrderByUserId=async(req,res)=>{
    try{
        const {user_id}=req.body;
        const orders=await data.query('SELECT * FROM orders WHERE user_id = ?',[user_id]);
        return res.status(200).send({message:'Orders fetched successfully',orders});
    }catch(err){
        return res.status(500).send({message:'Internal server error'});
    }
}

const getOrderByUserEmail=async(req,res)=>
{
    try{
        const {email}=req.body;
        const orders=await data.query('SELECT * FROM orders WHERE customer_email = ?',[email]);
        return res.status(200).send({message:'Orders fetched successfully',orders});
    }catch(err){
        return res.status(500).send({message:'Internal server error'});
    }
}

const updateOrderStatus = async (req, res) => {
    try {
      const { order_id, status } = req.body;
  
      const [currentOrder] = await data.query('SELECT status FROM orders WHERE id = ?', [order_id]);
      if (!currentOrder || !currentOrder.length) {
        return res.status(404).send({ message: 'Order not found' });
      }
  
      const oldStatus = currentOrder[0].status;
  
      if (status === 'cancelled' && oldStatus !== 'cancelled') {
        const [items] = await data.query('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [order_id]);
  
        for (const item of items) {
          await data.query(
            'UPDATE products SET stock = stock + ? WHERE id = ?',
            [item.quantity, item.product_id]
          );
        }
      }
  
      else if (oldStatus === 'cancelled' && status !== 'cancelled') {
        const [items] = await data.query('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [order_id]);
  
        for (const item of items) {
          await data.query(
            'UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?',
            [item.quantity, item.product_id, item.quantity]
          );
        }
      }
  
      await data.query('UPDATE orders SET status = ? WHERE id = ?', [status, order_id]);
  
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
        const user=await data.query('DELETE FROM users WHERE id = ?',[user_id]);
        return res.status(200).send({message:'User deleted successfully',user});
    }catch(err){
        return res.status(500).send({message:'Internal server error'});
    }
}

const getAllUsers=async(req,res)=>{
    try{
        const users=await data.query('SELECT * FROM users');
        return res.status(200).send({message:'Users fetched successfully',users:users[0]});
    }catch(err){
        return res.status(500).send({message:'Internal server error'});
    }
}

const getUserByEmail=async(req,res)=>{
    try{
        const {email}=req.body;
        const user=await data.query('SELECT * FROM users WHERE email = ?',[email]);
        return res.status(200).send({message:'User fetched successfully',user});
    }catch(err){
        return res.status(500).send({message:'Internal server error'});
    }
}

const getUserByPhone=async(req,res)=>{
    try{
        const {phone}=req.body;
        const user=await data.query('SELECT * FROM users WHERE phone = ?',[phone]);
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