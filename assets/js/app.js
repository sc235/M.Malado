let products = [];
let cart = JSON.parse(localStorage.getItem('cart') || '[]');

// --- CHARGEMENT DES DONNÉES ---
async function fetchProducts() {
    const loader = document.getElementById('loader');
    if (loader) loader.style.display = 'grid';

    // Récupération depuis Supabase au lieu du JSON local
    const { data, error } = await window.supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Erreur de chargement:", error);
        return;
    }

    products = data;
    renderList(products);
}

// --- COMMANDE WHATSAPP ---
function checkout() {
    if (!cart.length) return showToast('Votre panier est vide');
    
    let message = "Bonjour Mojo Molado ! Je souhaite commander :\n\n";
    cart.forEach((item, i) => {
        message += `${i + 1}. ${item.name} (${item.quantity}x)\n`;
    });
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    message += `\nTotal: ${total.toLocaleString()} FCFA`;
    
    window.open(`https://wa.me/221710433624?text=${encodeURIComponent(message)}`, '_blank');
    cart = [];
    saveCart();
    updateCart();
    closeCart();
}

window.addEventListener('DOMContentLoaded', fetchProducts);