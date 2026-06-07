import React, { useState, useEffect, useRef } from "react";
import * as math from "mathjs";

export default function MonteCarloIntegral() {
  // Estados del usuario
  const [funcionTexto, setFuncionTexto] = useState("x^2"); // Ej: x^2, sin(x), exp(-x)
  const [limiteA, setLimiteA] = useState(0);
  const [limiteB, setLimiteB] = useState(2);
  const [totalPuntos, setTotalPuntos] = useState(5000);

  // Estados de resultados
  const [puntosProcesados, setPuntosProcesados] = useState(0);
  const [puntosDentro, setPuntosDentro] = useState(0);
  const [resultadoAnalitico, setResultadoAnalitico] = useState(0);
  const [resultadoMonteCarlo, setResultadoMonteCarlo] = useState(0);
  const [errorRelativo, setErrorRelativo] = useState(0);

  // Estados de control de simulación
  const [isSimulating, setIsSimulating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [errorMensaje, setErrorMensaje] = useState("");

  // Referencias
  const canvasRef = useRef(null);
  const requestRef = useRef(null);

  // Referencia mutable para el loop de alta velocidad
  const stateRef = useRef({
    procesados: 0,
    dentro: 0,
    corriendo: false,
    a: 0,
    b: 0,
    m: 0, // Altura del rectángulo (Y max)
    total: 5000,
    valoresFuncion: [], // Para guardar el trazado de la curva original
  });

  // Limpiar curvas al cambiar parámetros básicos
  useEffect(() => {
    dibujarBaseGrafica();
  }, [funcionTexto, limiteA, limiteB]);

  // Dibujar la cuadrícula, los ejes y la función matemática real
  const dibujarBaseGrafica = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const padding = 40;
    const w = canvas.width - 2 * padding;
    const h = canvas.height - 2 * padding;

    // Ejes cartesianos
    ctx.strokeStyle = "#ced6e0";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, canvas.height - padding); // Eje Y
    ctx.lineTo(canvas.width - padding, canvas.height - padding); // Eje X
    ctx.stroke();

    try {
      setErrorMensaje("");
      const expr = math.compile(funcionTexto);

      // Encontrar el valor máximo de la función en el intervalo [a, b] para definir la altura M del rectángulo
      let yMax = 0.1;
      const pasosEvaluacion = 100;
      const puntosCurva = [];

      for (let i = 0; i <= pasosEvaluacion; i++) {
        const xVal = limiteA + (i / pasosEvaluacion) * (limiteB - limiteA);
        const yVal = expr.evaluate({ x: xVal });
        if (yVal > yMax) yMax = yVal;
        puntosCurva.push({ x: xVal, y: yVal });
      }

      // Añadir un 10% de margen superior al rectángulo de aceptación y rechazo
      yMax = yMax * 1.1;
      stateRef.current.m = yMax;

      // Dibujar Rectángulo de Confinamiento (Hit-or-Miss box)
      ctx.strokeStyle = "rgba(116, 185, 255, 0.4)";
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(padding, padding, w, h);
      ctx.setLineDash([]);

      // Dibujar la curva analítica real de la función
      ctx.strokeStyle = "#fffa65"; // Amarillo brillante
      ctx.lineWidth = 2.5;
      ctx.beginPath();

      puntosCurva.forEach((pt, idx) => {
        // Mapeo lineal a coordenadas de pixeles del Canvas
        const px = padding + ((pt.x - limiteA) / (limiteB - limiteA)) * w;
        const py = canvas.height - padding - (pt.y / yMax) * h;

        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();

      // Textos de límites en los ejes
      ctx.fillStyle = "#ced6e0";
      ctx.font = "12px sans-serif";
      ctx.fillText(`x=${limiteA}`, padding - 10, canvas.height - padding + 20);
      ctx.fillText(
        `x=${limiteB}`,
        canvas.width - padding - 20,
        canvas.height - padding + 20
      );
      ctx.fillText(`y=${yMax.toFixed(2)}`, padding - 35, padding + 5);
    } catch (err) {
      setErrorMensaje("Error al interpretar la expresión matemática.");
    }
  };

  const simularPaso = () => {
    const { procesados, total, corriendo, a, b, m } = stateRef.current;

    if (!corriendo || procesados >= total) {
      setIsSimulating(false);
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const padding = 40;
    const w = canvas.width - 2 * padding;
    const h = canvas.height - 2 * padding;

    const expr = math.compile(funcionTexto);
    const bloque = Math.max(1, Math.floor(total / 100));

    for (let i = 0; i < bloque; i++) {
      if (stateRef.current.procesados >= total) break;

      // 1. Generar variables aleatorias uniformes en el rectángulo [a, b] x [0, M]
      const xRand = a + Math.random() * (b - a);
      const yRand = Math.random() * m;

      // 2. Evaluar la función en xRand
      const yFuncion = expr.evaluate({ x: xRand });

      // 3. Condición de Aceptación (Hit o Miss)
      const dentro = yRand <= yFuncion;

      stateRef.current.procesados += 1;
      if (dentro) stateRef.current.dentro += 1;

      // Pintar los puntos en el canvas (Límite para conservar rendimiento)
      if (stateRef.current.procesados <= 10000) {
        const px = padding + ((xRand - a) / (b - a)) * w;
        const py = canvas.height - padding - (yRand / m) * h;

        ctx.fillStyle = dentro ? "#00ff88" : "#ff4757"; // Verde dentro, Rojo fuera
        ctx.fillRect(px, py, 1.5, 1.5);
      }
    }

    // Calcular aproximación de la Integral por Montecarlo
    // Área = Área del Rectángulo * (Puntos Dentro / Total Puntos)
    const prog = stateRef.current.procesados;
    const dent = stateRef.current.dentro;
    const areaRectangulo = (b - a) * m;
    const intEstimada = areaRectangulo * (dent / prog);

    setPuntosProcesados(prog);
    setPuntosDentro(dent);
    setResultadoMonteCarlo(intEstimada);

    // Calcular error relativo porcentual respecto al analítico
    if (resultadoAnalitico !== 0) {
      const err =
        Math.abs((intEstimada - resultadoAnalitico) / resultadoAnalitico) * 100;
      setErrorRelativo(err);
    }

    if (stateRef.current.corriendo) {
      requestRef.current = requestAnimationFrame(simularPaso);
    }
  };

  // Manejador de la pausa del loop de animación
  useEffect(() => {
    if (isSimulating && !isPaused) {
      stateRef.current.corriendo = true;
      requestRef.current = requestAnimationFrame(simularPaso);
    } else {
      stateRef.current.corriendo = false;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    return () => {
      stateRef.current.corriendo = false;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isSimulating, isPaused]);

  const iniciarSimulacion = () => {
    try {
      // 1. Calcular el valor Analítico Exacto de la integral usando reglas numéricas de MathJS
      // Creamos una función nativa a partir del string para que la cuadratura sea veloz
      const expr = math.compile(funcionTexto);

      // Integración analítica/numérica aproximada de alta precisión (Método de Simpson compuesto)
      const pasosSimpson = 2000;
      const hSimpson = (limiteB - limiteA) / pasosSimpson;
      let sumaSimpson =
        expr.evaluate({ x: limiteA }) + expr.evaluate({ x: limiteB });

      for (let i = 1; i < pasosSimpson; i++) {
        const x = limiteA + i * hSimpson;
        sumaSimpson += expr.evaluate({ x }) * (i % 2 === 0 ? 2 : 4);
      }
      const valorAnaliticoCalculado = (hSimpson / 3) * sumaSimpson;
      setResultadoAnalitico(valorAnaliticoCalculado);

      // 2. Reiniciar el estado de la animación
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      dibujarBaseGrafica(); // Limpiar lienzo antes de tirar puntos

      stateRef.current = {
        ...stateRef.current,
        procesados: 0,
        dentro: 0,
        corriendo: true,
        a: parseFloat(limiteA),
        b: parseFloat(limiteB),
        total: parseInt(totalPuntos),
      };

      setPuntosProcesados(0);
      setPuntosDentro(0);
      setResultadoMonteCarlo(0);
      setErrorRelativo(0);
      setIsPaused(false);
      setIsSimulating(true);
    } catch (err) {
      setErrorMensaje(
        "Asegúrate de que la función y los límites sean válidos."
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#1e272e] text-white flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-[1100px] grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* PANEL DE CONFIGURACIÓN Y ESTADÍSTICAS */}
        <div className="md:col-span-5 bg-[#2f3542] rounded-xl p-6 flex flex-col justify-between shadow-2xl border border-gray-700">
          <div>
            <h2 className="text-center text-lg font-bold tracking-wider mb-4 text-[#74b9ff]">
              MONTECARLO: HIT-OR-MISS
            </h2>

            {errorMensaje && (
              <div className="bg-[#ff4757] text-white text-xs p-2 rounded mb-4 font-semibold text-center">
                {errorMensaje}
              </div>
            )}

            {/* Inputs del Ejercicio */}
            <div className="space-y-3 mb-4">
              <div>
                <label className="text-xs text-[#ced6e0]">Función f(x):</label>
                <input
                  type="text"
                  value={funcionTexto}
                  disabled={isSimulating}
                  onChange={(e) => setFuncionTexto(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#1e272e] border border-gray-600 rounded text-sm text-[#eccc68] font-mono outline-none"
                  placeholder="Ej: x^2 + sin(x)"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#ced6e0]">
                    Límite inferior (a):
                  </label>
                  <input
                    type="number"
                    value={limiteA}
                    disabled={isSimulating}
                    onChange={(e) =>
                      setLimiteA(parseFloat(e.target.value) || 0)
                    }
                    className="w-full px-3 py-1.5 bg-[#1e272e] border border-gray-600 rounded text-sm text-center"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#ced6e0]">
                    Límite superior (b):
                  </label>
                  <input
                    type="number"
                    value={limiteB}
                    disabled={isSimulating}
                    onChange={(e) =>
                      setLimiteB(parseFloat(e.target.value) || 0)
                    }
                    className="w-full px-3 py-1.5 bg-[#1e272e] border border-gray-600 rounded text-sm text-center"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-[#ced6e0] block text-center">
                  Disparos Aleatorios (N):
                </label>
                <div className="flex justify-center">
                  <input
                    type="number"
                    value={totalPuntos}
                    disabled={isSimulating}
                    onChange={(e) =>
                      setTotalPuntos(parseInt(e.target.value) || 0)
                    }
                    className="w-36 text-center py-1 bg-[#1e272e] border border-[#5352ed] rounded font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Botones */}
            <div className="flex justify-center gap-3 mb-4">
              <button
                onClick={iniciarSimulacion}
                disabled={isSimulating && !isPaused}
                className="px-4 py-2 bg-[#5352ed] hover:bg-[#40407a] text-xs font-bold rounded transition-all disabled:bg-gray-600"
              >
                {isSimulating ? "Calculando..." : "Calcular Integral"}
              </button>

              <button
                onClick={() => setIsPaused(!isPaused)}
                disabled={!isSimulating}
                className={`px-4 py-2 text-xs font-bold rounded transition-all ${
                  isPaused ? "bg-[#2ecc71]" : "bg-[#e67e22]"
                } disabled:bg-gray-600`}
              >
                {isPaused ? "Reanudar" : "Pausar"}
              </button>
            </div>

            {/* Marcador de Puntos */}
            <div className="bg-[#1e272e] rounded p-3 mb-4 text-xs space-y-1 font-mono">
              <p className="text-center text-[#74b9ff] font-bold mb-1">
                {puntosProcesados.toLocaleString()} /{" "}
                {totalPuntos.toLocaleString()}
              </p>
              <p className="text-[#00ff88]">
                Aceptados: {puntosDentro.toLocaleString()}
              </p>
              <p className="text-[#ff4757]">
                Rechazados: {(puntosProcesados - puntosDentro).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Bloque de Datos Comparativos */}
          <div className="space-y-3 pt-3 border-t border-gray-700 font-mono">
            <div>
              <p className="text-[11px] text-[#ced6e0]">
                Resultados Analítico (Exacto):
              </p>
              <p className="text-sm font-bold text-white bg-[#1e272e] py-1 px-2 rounded">
                {puntosProcesados > 0 ? resultadoAnalitico.toFixed(6) : "-"}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-[#ced6e0]">
                Resultado Montecarlo (Hit-or-Miss):
              </p>
              <p className="text-lg font-black text-[#eccc68] bg-[#1e272e] py-1 px-2 rounded">
                {puntosProcesados > 0 ? resultadoMonteCarlo.toFixed(6) : "-"}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-[#ced6e0]">
                Error Relativo Porcentual:
              </p>
              <p className="text-sm font-bold text-[#ff6b6b]">
                {puntosProcesados > 0 ? `${errorRelativo.toFixed(4)}%` : "-"}
              </p>
            </div>
          </div>
        </div>

        {/* AREA GRÁFICA DEL HIT-OR-MISS */}
        <div className="md:col-span-7 bg-[#1e272e] flex flex-col items-center justify-center">
          <div className="bg-[#2f3542] p-4 rounded-xl shadow-2xl border border-gray-700 w-full flex justify-center">
            <canvas
              ref={canvasRef}
              width={500}
              height={450}
              className="bg-[#2f3542] rounded-lg max-w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
