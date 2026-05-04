import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { supabase } from "./lib/supabase";
import logo from "./assets/logo.jpg";

const CART_STORAGE_KEY = "pollo-cesar-cart-v1";
const BRANCH_STORAGE_KEY = "pollo-cesar-branch-v1";

const sucursales = [
  {
    id: "fuertes",
    nombre: "Pollos Cesar Los Fuertes",
    whatsapp: "50432881306",
  },
  {
    id: "coxen-hole",
    nombre: "Pollos Cesar Coxen Hole",
    whatsapp: "50433056395",
  },
];

const categorias = ["Comidas", "Bebidas", "Complementos"];

const obtenerCategoriaProducto = (producto) => {
  const tipo =
    `${producto.tipo ?? ""} ${producto.subcategoria ?? ""}`.toLowerCase();
  if (tipo.includes("bebida")) {
    return "Bebidas";
  }
  if (tipo.includes("complemento") || tipo.includes("extra")) {
    return "Complementos";
  }
  return "Comidas";
};

function App() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [categoriaActiva, setCategoriaActiva] = useState("Comidas");
  const [vistaActiva, setVistaActiva] = useState("menu");
  const [tipoEntrega, setTipoEntrega] = useState("Delivery");
  const [metodoPago, setMetodoPago] = useState("Efectivo");
  const [mostrarModalConfirmacion, setMostrarModalConfirmacion] =
    useState(false);
  const [carrito, setCarrito] = useState(() => {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  });
  const [sucursalId, setSucursalId] = useState(() => {
    return localStorage.getItem(BRANCH_STORAGE_KEY) ?? sucursales[0].id;
  });

  const cargarProductos = async () => {
    setLoading(true);
    setError("");

    const { data, error: queryError } = await supabase
      .from("productos")
      .select(
        "id, codigo, nombre, imagen, precio, tipo, tipo_impuesto, impuesto, sub_total, subcategoria",
      )
      .order("codigo", { ascending: true });

    if (queryError) {
      setError("No fue posible cargar los productos. Verifica Supabase.");
      setProductos([]);
      setLoading(false);
      return;
    }

    setProductos(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    cargarProductos();
  }, []);

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(carrito));
  }, [carrito]);

  useEffect(() => {
    localStorage.setItem(BRANCH_STORAGE_KEY, sucursalId);
  }, [sucursalId]);

  const productosFiltrados = useMemo(() => {
    const term = search.trim().toLowerCase();

    return productos.filter((producto) => {
      const coincideCategoria =
        obtenerCategoriaProducto(producto) === categoriaActiva;

      const coincideBusqueda =
        term.length === 0 ||
        producto.nombre.toLowerCase().includes(term) ||
        String(producto.codigo).includes(term);

      return coincideCategoria && coincideBusqueda;
    });
  }, [productos, search, categoriaActiva]);

  const productosCarrusel = productosFiltrados;

  const menuPorSubcategoria = useMemo(() => {
    const grupos = new Map();
    productosFiltrados.forEach((producto) => {
      const key = producto.subcategoria?.trim() || "General";
      if (!grupos.has(key)) {
        grupos.set(key, []);
      }
      grupos.get(key).push(producto);
    });

    return Array.from(grupos.entries()).map(([subcategoria, items]) => ({
      subcategoria,
      items,
    }));
  }, [productosFiltrados]);

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat("es-HN", {
        style: "currency",
        currency: "HNL",
        minimumFractionDigits: 2,
      }),
    [],
  );

  const total = useMemo(
    () =>
      carrito.reduce((acumulado, item) => {
        return acumulado + Number(item.precio) * item.cantidad;
      }, 0),
    [carrito],
  );

  const totalItems = useMemo(
    () => carrito.reduce((acumulado, item) => acumulado + item.cantidad, 0),
    [carrito],
  );

  const sucursalActiva =
    sucursales.find((sucursal) => sucursal.id === sucursalId) ?? sucursales[0];

  const agregarAlCarrito = (producto) => {
    setCarrito((actual) => {
      const existente = actual.find((item) => item.id === producto.id);
      if (existente) {
        return actual.map((item) =>
          item.id === producto.id
            ? { ...item, cantidad: item.cantidad + 1 }
            : item,
        );
      }

      return [
        ...actual,
        {
          id: producto.id,
          nombre: producto.nombre,
          precio: Number(producto.precio),
          imagen: producto.imagen,
          nota: "",
          cantidad: 1,
        },
      ];
    });

    setVistaActiva("menu");
  };

  const cambiarCantidad = (id, delta) => {
    setCarrito((actual) =>
      actual
        .map((item) =>
          item.id === id
            ? { ...item, cantidad: Math.max(0, item.cantidad + delta) }
            : item,
        )
        .filter((item) => item.cantidad > 0),
    );
  };

  const limpiarCarrito = () => setCarrito([]);

  const actualizarNota = (id, nota) => {
    setCarrito((actual) =>
      actual.map((item) => (item.id === id ? { ...item, nota } : item)),
    );
  };

  const moverCarrusel = (direccion) => {
    const contenedor = document.getElementById(`carousel-${categoriaActiva}`);
    if (!contenedor) {
      return;
    }
    const paso = Math.max(260, contenedor.clientWidth * 0.9);
    contenedor.scrollBy({
      left: direccion === "izquierda" ? -paso : paso,
      behavior: "smooth",
    });
  };

  const realizarPedido = () => {
    if (carrito.length === 0) {
      return;
    }

    const lineas = carrito.map((item, index) => {
      const subtotal = Number(item.precio) * item.cantidad;
      const nota = item.nota?.trim() ? ` (Nota: ${item.nota.trim()})` : "";
      return `${index + 1}. ${item.nombre}\n   Cantidad: ${item.cantidad}\n   Subtotal: ${currencyFormatter.format(subtotal)}${nota}`;
    });

    const mensaje = [
      "PEDIDO NUEVO",
      "",
      `Hola ${sucursalActiva.nombre}, quiero realizar este pedido:`,
      "",
      "DATOS DEL PEDIDO",
      `- Sucursal: ${sucursalActiva.nombre}`,
      `- Tipo de entrega: ${tipoEntrega}`,
      `- Método de pago: ${metodoPago}`,
      "",
      "DETALLE",
      ...lineas,
      "",
      "RESUMEN",
      `- Artículos: ${totalItems}`,
      `- Total a pagar: ${currencyFormatter.format(total)}`,
    ].join("\n");

    const url = `https://wa.me/${sucursalActiva.whatsapp}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setCarrito([]);
    setVistaActiva("menu");
    setMostrarModalConfirmacion(true);
  };

  return (
    <main className="menu-page">
      {vistaActiva === "menu" ? (
        <>
          <header className="menu-header">
            <img src={logo} alt="Logo Pollos Cesar" className="page-logo" />
            <h1>MENU POLLOS CESAR</h1>
            <p>Catálogo interactivo conectado a Supabase</p>
          </header>

          <section className="menu-controls" aria-label="Filtros del menú">
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar "
              className="search-input"
            />
            <button
              type="button"
              className="refresh-button"
              onClick={cargarProductos}
            >
              Actualizar
            </button>
          </section>
        </>
      ) : null}

      {loading ? <p className="status-message">Cargando productos...</p> : null}

      {error ? <p className="status-message error-message">{error}</p> : null}

      {!loading && !error && vistaActiva === "menu" ? (
        <section
          className="carousel-section"
          aria-label={`Carrusel ${categoriaActiva}`}
        >
          <div className="carousel-head">
            <h2>{categoriaActiva}</h2>
            <div className="carousel-actions">
              <button
                type="button"
                className="carousel-button"
                onClick={() => moverCarrusel("izquierda")}
                aria-label="Mover a la izquierda"
              >
                ‹
              </button>
              <button
                type="button"
                className="carousel-button"
                onClick={() => moverCarrusel("derecha")}
                aria-label="Mover a la derecha"
              >
                ›
              </button>
            </div>
          </div>

          <div className="carousel" id={`carousel-${categoriaActiva}`}>
            {productosCarrusel.map((producto) => (
              <article className="card" key={producto.id}>
                <div className="card-image-wrap">
                  {producto.imagen ? (
                    <img
                      src={producto.imagen}
                      alt={producto.nombre}
                      className="card-image"
                      loading="lazy"
                    />
                  ) : (
                    <div className="no-image">Sin imagen</div>
                  )}
                </div>

                <div className="card-content">
                  <p className="code">Código #{producto.codigo}</p>
                  <h3>{producto.nombre}</h3>
                  <p className="price">
                    {currencyFormatter.format(Number(producto.precio))}
                  </p>
                  <p className="meta">
                    <span>{producto.subcategoria ?? "General"}</span>
                    <span>Imp. {producto.tipo_impuesto}</span>
                  </p>
                  <button
                    type="button"
                    className="add-button"
                    onClick={() => agregarAlCarrito(producto)}
                  >
                    Agregar al carrito
                  </button>
                </div>
              </article>
            ))}
          </div>

          <div className="subcat-menu">
            <h2>Menú por subcategoría</h2>
            {menuPorSubcategoria.map((grupo) => (
              <section key={grupo.subcategoria} className="subcat-group">
                <h3>{grupo.subcategoria}</h3>
                <div className="subcat-grid">
                  {grupo.items.map((producto) => (
                    <article
                      key={`${grupo.subcategoria}-${producto.id}`}
                      className="card card-compact"
                    >
                      <div className="card-image-wrap">
                        {producto.imagen ? (
                          <img
                            src={producto.imagen}
                            alt={producto.nombre}
                            className="card-image"
                            loading="lazy"
                          />
                        ) : (
                          <div className="no-image">Sin imagen</div>
                        )}
                      </div>
                      <div className="card-content">
                        <h4>{producto.nombre}</h4>
                        <p className="price">
                          {currencyFormatter.format(Number(producto.precio))}
                        </p>
                        <button
                          type="button"
                          className="add-button"
                          onClick={() => agregarAlCarrito(producto)}
                        >
                          Agregar
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </section>
      ) : null}

      {!loading && !error && productosCarrusel.length === 0 ? (
        <p className="status-message">No hay productos para ese filtro.</p>
      ) : null}

      {vistaActiva === "carrito" ? (
        <section className="cart-view" aria-label="Carrito de compra">
          <div className="cart-header">
            <h2>Carrito de compra</h2>
            <span>{totalItems} productos</span>
          </div>

          <button
            type="button"
            className="back-button"
            onClick={() => setVistaActiva("menu")}
          >
            ← Volver al menú
          </button>

          {carrito.length === 0 ? (
            <p className="empty-cart">Tu carrito está vacío.</p>
          ) : (
            <div className="cart-items">
              {carrito.map((item) => (
                <article key={item.id} className="cart-item">
                  {item.imagen ? (
                    <img
                      src={item.imagen}
                      alt={item.nombre}
                      className="cart-item-image"
                    />
                  ) : (
                    <div className="cart-item-image no-image">Sin imagen</div>
                  )}
                  <div className="cart-item-info">
                    <h3>{item.nombre}</h3>
                    <p>{currencyFormatter.format(item.precio)}</p>
                    <input
                      type="text"
                      value={item.nota ?? ""}
                      onChange={(event) =>
                        actualizarNota(item.id, event.target.value)
                      }
                      className="note-input"
                      placeholder="Nota para este producto"
                    />
                  </div>
                  <div className="cart-qty">
                    <button
                      type="button"
                      onClick={() => cambiarCantidad(item.id, -1)}
                    >
                      -
                    </button>
                    <span>{item.cantidad}</span>
                    <button
                      type="button"
                      onClick={() => cambiarCantidad(item.id, 1)}
                    >
                      +
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="cart-footer">
            <div>
              <label>Selecciona sucursal para el pedido:</label>
              <div className="branch-buttons">
                {sucursales.map((sucursal) => (
                  <button
                    key={sucursal.id}
                    type="button"
                    className={`branch-button ${sucursalId === sucursal.id ? "branch-button-active" : ""}`}
                    onClick={() => setSucursalId(sucursal.id)}
                  >
                    {sucursal.nombre}
                  </button>
                ))}
              </div>
            </div>

            <div className="order-data-grid">
              <div>
                <label htmlFor="tipoEntrega">
                  ¿Pedido delivery o para recoger?
                </label>
                <select
                  id="tipoEntrega"
                  value={tipoEntrega}
                  onChange={(event) => setTipoEntrega(event.target.value)}
                >
                  <option value="Delivery">Delivery</option>
                  <option value="Para recoger">Para recoger</option>
                </select>
              </div>
              <div>
                <label htmlFor="metodoPago">¿Método de pago?</label>
                <select
                  id="metodoPago"
                  value={metodoPago}
                  onChange={(event) => setMetodoPago(event.target.value)}
                >
                  <option value="Efectivo">Efectivo</option>
                  <option value="Transferencia">Transferencia</option>
                  <option value="Tarjeta">Tarjeta</option>
                </select>
              </div>
            </div>

            <p className="total">Total: {currencyFormatter.format(total)}</p>

            <div className="cart-buttons">
              <button
                type="button"
                className="clear-button"
                onClick={limpiarCarrito}
              >
                Vaciar carrito
              </button>
              <button
                type="button"
                className="order-button"
                onClick={realizarPedido}
                disabled={carrito.length === 0}
              >
                Realizar pedido por WhatsApp
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <div className="floating-actions">
        {vistaActiva === "menu" ? (
          <section
            className="chips chips-floating"
            aria-label="Filtrar por categoría"
          >
            {categorias.map((categoria) => (
              <button
                key={categoria}
                type="button"
                className={`chip ${categoriaActiva === categoria ? "chip-active" : ""}`}
                onClick={() => setCategoriaActiva(categoria)}
              >
                {categoria}
              </button>
            ))}
          </section>
        ) : null}

        <button
          type="button"
          className="floating-cart"
          onClick={() => setVistaActiva("carrito")}
          aria-label="Abrir carrito"
        >
          🛒
          <span>Carrito</span>
          <strong>{totalItems}</strong>
        </button>
      </div>

      {mostrarModalConfirmacion ? (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="confirm-modal">
            <h2>Pedido enviado</h2>
            <p>Pronto la sucursa se pondra en contacto contigo</p>
            <button
              type="button"
              className="modal-button"
              onClick={() => setMostrarModalConfirmacion(false)}
            >
              Entendido
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}

export default App;
