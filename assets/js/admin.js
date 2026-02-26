let adminProducts = [];

// --- SÉCURITÉ & AUTH ---
async function checkAuth() {
    const { data: { session } } = await window.supabase.auth.getSession();
    const authScreen = document.getElementById('auth-screens');
    const dashboard = document.getElementById('admin-dashboard');

    if (session) {
        authScreen.style.display = 'none';
        dashboard.style.display = 'block';
        loadAdminData();
    } else {
        authScreen.style.display = 'flex';
        dashboard.style.display = 'none';
    }
}

async function loginAdmin() {
    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;

    const { error } = await window.supabase.auth.signInWithPassword({ email, password });
    if (error) showToast("Accès refusé");
    else checkAuth();
}

// --- GESTION DES PRODUITS ---
async function saveProduct() {
    const id = document.getElementById('product-id').value;
    const newProduct = {
        name: document.getElementById('product-name').value,
        category: document.getElementById('product-category').value,
        price: parseInt(document.getElementById('product-price').value),
        price_display: document.getElementById('product-price').value + " FCFA",
        stock: parseInt(document.getElementById('product-stock').value),
        image: document.getElementById('product-image').value,
        description: document.getElementById('product-description').value
    };

    const { error } = id 
        ? await window.supabase.from('products').update(newProduct).eq('id', id)
        : await window.supabase.from('products').insert([newProduct]);

    if (!error) {
        showToast("Base de données mise à jour !");
        closeProductModal();
        loadAdminData();
    }
}

window.addEventListener('DOMContentLoaded', checkAuth);