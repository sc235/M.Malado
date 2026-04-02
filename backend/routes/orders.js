const express = require('express');
const router = express.Router();
const supabase = require('../db');

router.post('/', async (req, res) => {
  try {
    const { items, total: clientTotal, customerInfo } = req.body;
    
    if (!items || !items.length) {
      return res.status(400).json({ error: 'Le panier est vide.' });
    }

    // Securely calculate total by pulling real prices from DB
    const itemIds = items.map(item => item.id);
    const { data: dbProducts, error: prodErr } = await supabase
      .from('products')
      .select('id, price')
      .in('id', itemIds);

    if (prodErr || !dbProducts) {
      console.error("Supabase error fetching products:", prodErr);
      throw new Error("Erreur de validation des produits");
    }

    console.log("Incoming item IDs:", itemIds);
    console.log("Products found in DB:", dbProducts);

    let serverCalculatedTotal = 0;
    
    // Validate each item
    for (const item of items) {
      const dbProduct = dbProducts.find(p => p.id === item.id);
      if (!dbProduct) {
        return res.status(400).json({ error: `Produit invalide ou supprimé: ${item.name}` });
      }
      serverCalculatedTotal += dbProduct.price * item.quantity;
    }

    // You could optionally reject the order if clientTotal !== serverCalculatedTotal
    // But overriding it with the server calculated total is safer.
    
    const orderData = {
      date: new Date().toISOString().split('T')[0],
      items: items,
      total: serverCalculatedTotal,
      customer_name: customerInfo?.name || 'Inconnu',
      customer_phone: customerInfo?.phone || 'Non fourni',
      customer_address: customerInfo?.address || 'Non fournie'
    };

    const { data, error } = await supabase
      .from('sales')
      .insert([orderData])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (err) {
    console.error("Error creating order:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
