function ProductCard({ product }) {
  return (
    <div className="product-card">
      <img
        src={product.image}
        alt={product.name}
        className="product-image"
      />

      <div className="product-info">
        <p className="product-category">{product.category}</p>

        <h3 className="product-name">{product.name}</h3>

        <div className="product-bottom">
          <span className="product-price">${product.price}</span>

          <button className="add-to-cart-button">
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProductCard;