"""
Motor de procesamiento del simulador Bursátil (versión de consola en Python).
Muestra, paso a paso, la misma lógica que usa app.js:
USUARIO -> INGRESA DATOS -> SISTEMA PROCESA -> GUARDA INFORMACION -> PRESENTA RESULTADOS
"""

CAPITAL_INICIAL = 10_000_000
EMPRESAS = {"A": 50000, "B": 80000, "C": 120000}

capital_disponible = CAPITAL_INICIAL
portafolio = []   # almacenamiento: inversiones activas
historial = []    # almacenamiento: todas las operaciones


def formato(valor):
    return f"${valor:,.0f}".replace(",", ".")


def comprar(empresa, precio, cantidad):
    """Entrada de datos -> procesamiento -> almacenamiento."""
    global capital_disponible
    valor_operacion = precio * cantidad  # procesamiento
    if valor_operacion > capital_disponible:
        print(f"Capital insuficiente. Necesitas {formato(valor_operacion)} "
              f"y tienes {formato(capital_disponible)}.")
        return
    capital_disponible -= valor_operacion  # procesamiento
    portafolio.append({"empresa": empresa, "cantidad": cantidad, "precio_compra": precio})
    historial.append({"tipo": "Compra", "empresa": empresa, "cantidad": cantidad,
                       "precio": precio, "resultado": None})
    print(f"Compraste {cantidad} acciones de {empresa} por {formato(valor_operacion)}. "
          f"Capital disponible: {formato(capital_disponible)}.")


def vender(indice_portafolio, precio_venta):
    """Entrada de datos -> procesamiento -> almacenamiento."""
    global capital_disponible
    inversion = portafolio[indice_portafolio]
    valor_venta = precio_venta * inversion["cantidad"]  # procesamiento
    resultado = (precio_venta - inversion["precio_compra"]) * inversion["cantidad"]  # procesamiento
    capital_disponible += valor_venta  # procesamiento
    historial.append({"tipo": "Venta", "empresa": inversion["empresa"],
                       "cantidad": inversion["cantidad"], "precio": precio_venta,
                       "resultado": resultado})
    portafolio.pop(indice_portafolio)
    signo = "+" if resultado >= 0 else ""
    print(f"Vendiste {inversion['cantidad']} acciones de {inversion['empresa']} "
          f"por {formato(valor_venta)}. Resultado: {signo}{formato(resultado)}.")


def mostrar_resumen():
    """Presentación de resultados."""
    valor_inversiones = sum(h["cantidad"] * h["precio_compra"] for h in portafolio)
    ganancia = sum(op["resultado"] for op in historial if op["resultado"] is not None)
    print("\n--- Resumen ---")
    print("Capital inicial:        ", formato(CAPITAL_INICIAL))
    print("Capital disponible:     ", formato(capital_disponible))
    print("Valor de inversiones:   ", formato(valor_inversiones))
    print("Ganancia/pérdida:       ", ("+" if ganancia >= 0 else "") + formato(ganancia))
    print("Valor total portafolio: ", formato(capital_disponible + valor_inversiones))


if __name__ == "__main__":
    # Ejemplo del recorrido completo, igual al de la página web
    comprar("Empresa A", EMPRESAS["A"], 20)   # 20 x $50.000 = $1.000.000
    vender(0, 60000)                          # vende a $60.000 -> ganancia de $10.000/acción
    mostrar_resumen()
