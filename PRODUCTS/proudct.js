const data=require('../Data/data')
const NodeCache=require('node-cache')
const cache=new NodeCache({stdTTL:60})
const cloudinary = require('../Data/cloudinary')
const { Readable } = require('stream')

const getAllProducts=async(req,res)=>{
    try
{
const c=cache.get('allProducts');
if(c){return res.status(200).send({message:'All Products',allProducts:c})}
const result=await data.query('SELECT * FROM products WHERE is_active=true');
const products = result.rows;
if(products.length===0){return res.status(404).send({message:'No products found'})}
cache.set('allProducts',products);
return res.status(200).send({message:'All Products',allProducts:products});
}
catch(err){return res.status(500).send({message:err.message})};
}

const getProudctByName=async(req,res)=>{
    try
    {
const {title}=req.body;
const u=`product_${title}`;
const c=cache.get(u);
if(c){return res.status(200).send({message:'Product found',product:c})}
const result=await data.query('SELECT * FROM products WHERE title=$1 AND is_active=true',[title]);
const product = result.rows;
if(product.length===0){return res.status(404).send({message:'Product not found'})}
cache.set(u,product)
return res.status(200).send({message:'Product found',product:product})
}
catch(err){return res.status(500).send({message:'Server error'})}
}

const getProductsByCategory=async(req,res)=>{
try{
const {category_name}=req.body;
const u=`cate_${category_name}`;
const c=cache.get(u);
if(c){return res.status(200).send({message:'Products found',products:c})}
const result=await data.query('SELECT * FROM products WHERE category_name=$1 AND is_active=true',[category_name]);
const productsByCate = result.rows;
if(productsByCate.length===0){return res.status(404).send({message:'No products found in this category'})}
cache.set(u,productsByCate)
return res.status(200).send({message:'Products found',products:productsByCate});
}
catch(err){return res.status(500).send({message:'Server error'})};
}

const getProductsInRange=async(req,res)=>{
try
{
const {minPrice,maxPrice}=req.body;
const u=`range_${minPrice}_${maxPrice}`;
const c=cache.get(u);
if(c){return res.status(200).send({message:'Products found',products:c})}
const result=await data.query('SELECT * FROM products WHERE price BETWEEN $1 AND $2 AND is_active=true',[minPrice,maxPrice]);
const productsRange = result.rows;
if(productsRange.length===0)return res.status(404).send({message:'No products found in this price range'})
cache.set(u,productsRange)
return res.status(200).send({message:'Products found',products:productsRange});
}
catch(err){return res.status(500).send({message:'Server error'})}
}


const addProduct = async (req, res) => {
  try {
    const { title, description, price, discount, stock, category_name, sizes, colors } = req.body;
    const files = req.files;

    if (!files || files.length === 0)
      return res.status(400).send({ message: "At least one image is required" });

    const imageUrls = [];

    for (const file of files) {
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "products" },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        Readable.from(file.buffer).pipe(stream);
      });
      imageUrls.push(uploadResult.secure_url);
    }

    const image_url = imageUrls.join(",");

    const result = await data.query(
      `INSERT INTO products (title, description, price, discount, stock, image_url, category_name, sizes, colors, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)`,
      [title, description, price, discount, stock, image_url, category_name, sizes, colors]
    );

    return res.status(200).send({
      message: "Product added successfully",
      image_url
    });

  } catch (err) {
    console.error(err);
    return res.status(500).send({ message: "Internal server error" });
  }
};




const updateProduct = async (req, res) => {
  try {
    const {
      id,
      title,
      description,
      price,
      category_name,
      discount,
      stock,
      image_url,
      sizes,
      colors,
      is_active
    } = req.body;

    if (!id || !title || !price || !category_name) {
      return res.status(400).send({ message: 'Missing required fields' });
    }

    let finalImageUrl = image_url || null;

    if (req.file && req.file.buffer) {
      const uploadPromise = new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'products' },
          (error, uploadResult) => {
            if (error) return reject(error);
            resolve(uploadResult.secure_url);
          }
        );
        Readable.from(req.file.buffer).pipe(stream);
      });
      finalImageUrl = await uploadPromise;
    } else if (image_url && image_url !== '0' && image_url !== 0) {
      finalImageUrl = image_url.toString().trim().replace(/^,+/, '');
    }

    const updateFields = [];
    const updateValues = [];

    updateFields.push(
      'title = $1',
      'description = $2',
      'price = $3',
      'category_name = $4',
      'discount = $5',
      'stock = $6'
    );

    updateValues.push(
      String(title),
      description ? String(description) : null,
      Number(price),
      String(category_name),
      Number(discount) || 0,
      Number(stock) || 0
    );

    let parameterCount = 7; // Starting from $7 since we have 6 basic fields

    if (finalImageUrl) {
      updateFields.push(`image_url = $${parameterCount}`);
      updateValues.push(finalImageUrl);
      parameterCount++;
    }

    if (sizes) {
      updateFields.push(`sizes = $${parameterCount}`);
      updateValues.push(Array.isArray(sizes) ? sizes.join(',') : String(sizes));
      parameterCount++;
    }

    if (colors) {
      updateFields.push(`colors = $${parameterCount}`);
      updateValues.push(Array.isArray(colors) ? colors.join(',') : String(colors));
      parameterCount++;
    }

    if (is_active !== undefined) {
      updateFields.push(`is_active = $${parameterCount}`);
      updateValues.push(is_active);
      parameterCount++;
    }

    updateValues.push(id);

    const result = await data.query(
      `UPDATE products SET ${updateFields.join(', ')} WHERE id = $${parameterCount}`,
      updateValues
    );

    if (result.rowCount === 0) {
      return res.status(404).send({ message: 'Product not found' });
    }

    cache.flushAll();
    return res.status(200).send({ message: 'Product updated successfully' });

  } catch (err) {
    console.error('Update Product Error:', err);
    return res.status(500).send({ message: 'Server error', error: err.message });
  }
};




const UnActtiveActtiveProduct=async(req,res)=>{
  try
  {
  const {id}=req.body;
  const result=await data.query('SELECT is_active FROM products WHERE id=$1',[id]);
  const product = result.rows;
  
  if(product.length===0){return res.status(404).send({message:'Product not found'})}
  
  const newStatus=product[0].is_active?false:true;

  await data.query('UPDATE products SET is_active=$1 WHERE id=$2',[newStatus,id]);
  cache.flushAll()
  return res.status(200).send({message:`Product ${newStatus?'activated':'deactivated'} successfully`});
  }
  catch(err){return res.status(500).send({message:'Server error'})}
  }

  const getProductByColor = async (req, res) => {
    try {
      const { color } = req.body;
  
      if (!color) {
        return res.status(400).send({ message: 'Color is required' });
      }
  
      const searchColor = color.trim();
  
      const result = await data.query(
        `SELECT * FROM products 
         WHERE is_active = true
         AND (
           colors LIKE $1 OR
           colors LIKE $2 OR
           colors LIKE $3 OR
           colors = $4
         )`,
        [`${searchColor},%`, `%,${searchColor},%`, `%,${searchColor}`, searchColor]
      );
      const products = result.rows;
  
      if (products.length === 0) {
        return res.status(404).send({ message: 'No products found for this color' });
      }
  
      return res.status(200).send({ message: 'Products found', products });
    } catch (err) {
      console.error('Get Product By Color Error:', err);
      return res.status(500).send({ message: 'Server error', error: err.message });
    }
  };
  




module.exports={getAllProducts,getProudctByName,getProductsByCategory,getProductsInRange,addProduct,updateProduct,UnActtiveActtiveProduct,getProductByColor};

