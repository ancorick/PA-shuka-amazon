import { useEffect, useState } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import { RequireAuth, RequireSeller } from './components/ui.jsx';
import { onWaking } from './api.js';
import Home from './pages/Home.jsx';
import Search from './pages/Search.jsx';
import Product from './pages/Product.jsx';
import Cart from './pages/Cart.jsx';
import Checkout from './pages/Checkout.jsx';
import Confirmation from './pages/Confirmation.jsx';
import MyOrders from './pages/MyOrders.jsx';
import OrderDetail from './pages/OrderDetail.jsx';
import { Login, Register } from './pages/Auth.jsx';
import Account from './pages/Account.jsx';
import NotFound from './pages/NotFound.jsx';
import BecomeSeller from './pages/seller/BecomeSeller.jsx';
import SellerLayout from './pages/seller/SellerLayout.jsx';
import Overview from './pages/seller/Overview.jsx';
import SellerProducts from './pages/seller/Products.jsx';
import ProductEditor from './pages/seller/ProductEditor.jsx';
import SellerOrders from './pages/seller/Orders.jsx';
import SellerOrderDetail from './pages/seller/OrderDetail.jsx';

function WakingBanner() {
  const [waking, setWaking] = useState(false);
  useEffect(() => { const off = onWaking(setWaking); return () => { off(); }; }, []);
  if (!waking) return null;
  return <div className="waking">Waking up the server… this can take up to a minute on the first visit.</div>;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <WakingBanner />
      <Header />
      <main className="site-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<Search />} />
          <Route path="/c/:slug" element={<Search />} />
          <Route path="/p/:id" element={<Product />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/cart" element={<RequireAuth><Cart /></RequireAuth>} />
          <Route path="/checkout" element={<RequireAuth><Checkout /></RequireAuth>} />
          <Route path="/orders" element={<RequireAuth><MyOrders /></RequireAuth>} />
          <Route path="/orders/:id" element={<RequireAuth><OrderDetail /></RequireAuth>} />
          <Route path="/orders/:id/confirmation" element={<RequireAuth><Confirmation /></RequireAuth>} />
          <Route path="/account" element={<RequireAuth><Account /></RequireAuth>} />
          <Route path="/sell" element={<RequireAuth><BecomeSeller /></RequireAuth>} />
          <Route path="/seller" element={<RequireSeller><SellerLayout /></RequireSeller>}>
            <Route index element={<Overview />} />
            <Route path="products" element={<SellerProducts />} />
            <Route path="products/new" element={<ProductEditor />} />
            <Route path="products/:id/edit" element={<ProductEditor />} />
            <Route path="orders" element={<SellerOrders />} />
            <Route path="orders/:id" element={<SellerOrderDetail />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}
