import React, { useState, useEffect, useRef } from "react";

export default function MonteCarloDashboard() {
  const [totalPuntos, setTotalPuntos] = useState(5000);
  const [puntosProcesados, setPuntosProcesados] = useState(0);
  const [puntosDentro, setPuntosDentro] = useState(0);
  const [piEstimado, setPiEstimado] = useState(0);
  const [errorRelativo, setErrorRelativo] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const canvasGeomRef = useRef(null);
  const canvasErrorRef = useRef(null);
  const requestRef = useRef(null);

  // Guardamos la configuración y el estado de simulación en la referencia
  // para evitar problemas de Stale Closure (valores obsoletos) en el loop.
  const stateRef = useRef({
    procesados: 0,
    dentro: 0,
    historialError: [],
    totalPuntosConfigurado: 5000, 
    corriendo: false
  });

  // Mantener sincronizado el total de puntos en la referencia cuando el usuario digite
  useEffect(() => {
    stateRef.current.totalPuntosConfigurado = totalPuntos;
  }, [totalPuntos]);

  const inicializarCanvasGeometria = (canvas) => {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "#74b9ff";
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, 340, 340);

    ctx.beginPath();
    ctx.arc(190, 190, 170, 0, 2 * Math.PI);
    ctx.strokeStyle = "#7fffd4";
    ctx.stroke();
  };

  const inicializarCanvasError = (canvas) => {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "#ced6e0";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(50, 40);
    ctx.lineTo(50, 340);
    ctx.lineTo(360, 340);
    ctx.stroke();

    ctx.fillStyle = "#ced6e0";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Progreso (N)", 205, 365);

    ctx.save();
    ctx.translate(15, 190);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("Error (%)", 0, 0);
    ctx.restore();

    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = "#3f4452";

    ctx.fillStyle = "#ff4757";
    ctx.fillText("5%", 35, 45);
    ctx.beginPath();
    ctx.moveTo(50, 40);
    ctx.lineTo(360, 40);
    ctx.stroke();

    ctx.fillStyle = "#ced6e0";
    ctx.fillText("2.5%", 32, 195);
    ctx.beginPath();
    ctx.moveTo(50, 190);
    ctx.lineTo(360, 190);
    ctx.stroke();

    ctx.fillStyle = "#00ff88";
    ctx.fillText("0%", 35, 345);
  };

  useEffect(() => {
    inicializarCanvasGeometria(canvasGeomRef.current);
    inicializarCanvasError(canvasErrorRef.current);
  }, []);

  // Loop de simulación robusto
  const simularPaso = () => {
    const { procesados, totalPuntosConfigurado, corriendo } = stateRef.current;

    // Si la referencia dice que ya no debe correr o llegó al límite, detenemos.
    if (!corriendo || procesados >= totalPuntosConfigurado) {
      setIsSimulating(false);
      return;
    }

    const canvasGeom = canvasGeomRef.current;
    const canvasError = canvasErrorRef.current;
    if (!canvasGeom || !canvasError) return;

    const ctxGeom = canvasGeom.getContext("2d");
    const ctxError = canvasError.getContext("2d");

    // Bloque adaptativo basado en el total configurado en la ref
    const bloque = Math.max(1, Math.floor(totalPuntosConfigurado / 100));

    for (let i = 0; i < bloque; i++) {
      if (stateRef.current.procesados >= totalPuntosConfigurado) break;

      const x = Math.random() * 2 - 1;
      const y = Math.random() * 2 - 1;
      const dentro = x * x + y * y <= 1;

      stateRef.current.procesados += 1;
      if (dentro) stateRef.current.dentro += 1;

      if (stateRef.current.procesados <= 8000) {
        const px = 190 + x * 170;
        const py = 190 - y * 170;
        ctxGeom.fillStyle = dentro ? "#00ff88" : "#ff4757";
        ctxGeom.fillRect(px, py, 2, 2);
      }
    }

    const prog = stateRef.current.procesados;
    const dent = stateRef.current.dentro;
    const piEst = (4 * dent) / prog;
    const errRel = Math.abs((piEst - Math.PI) / Math.PI) * 100;

    setPuntosProcesados(prog);
    setPuntosDentro(dent);
    setPiEstimado(piEst);
    setErrorRelativo(errRel);

    // Calcular escala basándose fielmente en el límite configurado original
    const xGraf = 50 + (prog / totalPuntosConfigurado) * 310;
    const errorGraf = Math.min(errRel, 5.0);
    const yGraf = 340 - (errorGraf / 5.0) * 300;

    ctxError.setLineDash([]);
    ctxError.strokeStyle = "#ff4757";
    ctxError.lineWidth = 2;

    const historial = stateRef.current.historialError;
    ctxError.beginPath();
    if (historial.length > 0) {
      const ultimo = historial[historial.length - 1];
      ctxError.moveTo(ultimo.x, ultimo.y);
      ctxError.lineTo(xGraf, yGraf);
    } else {
      ctxError.moveTo(50, yGraf);
      ctxError.lineTo(xGraf, yGraf);
    }
    ctxError.stroke();

    stateRef.current.historialError.push({ x: xGraf, y: yGraf });

    // Volver a solicitar frame si seguimos en ejecución
    if (stateRef.current.corriendo) {
      requestRef.current = requestAnimationFrame(simularPaso);
    }
  };

  // Control centralizado del ciclo de vida de la animación
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
    if (totalPuntos <= 0 || isNaN(totalPuntos)) {
      alert("Por favor ingresa un número entero positivo.");
      return;
    }

    // Cancelar cualquier animación previa activa inmediatamente
    if (requestRef.current) cancelAnimationFrame(requestRef.current);

    // Inicializar estado mutable de la referencia de golpe
    stateRef.current = {
      procesados: 0,
      dentro: 0,
      historialError: [],
      totalPuntosConfigurado: totalPuntos,
      corriendo: true
    };

    setPuntosProcesados(0);
    setPuntosDentro(0);
    setPiEstimado(0);
    setErrorRelativo(0);
    setIsPaused(false);

    inicializarCanvasGeometria(canvasGeomRef.current);
    inicializarCanvasError(canvasErrorRef.current);

    setIsSimulating(true);
  };

  const alternarPausa = () => {
    setIsPaused((prev) => !prev);
  };

  return (
    <div className="min-h-screen bg-[#1e272e] text-white flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-[1250px] grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* PANEL 1: CONTROL */}
        <div className="md:col-span-4 bg-[#2f3542] rounded-xl p-6 flex flex-col justify-between shadow-2xl border border-gray-700">
          <div>
            <h2 className="text-center text-xl font-bold tracking-wider mb-6 text-white">
              MÉTODO DE MONTECARLO
            </h2>

            <div className="flex flex-col items-center mb-4">
              <label className="text-sm text-[#ced6e0] mb-2">
                Iteraciones (N):
              </label>
              <input
                type="number"
                value={totalPuntos}
                disabled={isSimulating}
                onChange={(e) => setTotalPuntos(parseInt(e.target.value) || 0)}
                className="w-40 text-center font-bold text-lg py-2 bg-[#1e272e] text-white border border-[#5352ed] rounded-lg outline-none disabled:opacity-50 transition-all"
              />
            </div>

            <div className="flex justify-center gap-4 mb-6">
              <button
                onClick={iniciarSimulacion}
                disabled={isSimulating && !isPaused}
                className="px-6 py-2.5 bg-[#5352ed] hover:bg-[#40407a] text-white font-bold rounded-lg shadow-md transition-all disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                {isSimulating ? "Simulando..." : "Iniciar"}
              </button>

              <button
                onClick={alternarPausa}
                disabled={!isSimulating}
                className={`px-6 py-2.5 text-white font-bold rounded-lg shadow-md transition-all ${
                  isPaused
                    ? "bg-[#2ecc71] hover:bg-[#27ae60]"
                    : "bg-[#e67e22] hover:bg-[#d35400]"
                } disabled:bg-gray-600 disabled:cursor-not-allowed`}
              >
                {isPaused ? "▶ Reanudar" : "Pausar"}
              </button>
            </div>

            <div className="bg-[#1e272e] rounded-lg p-4 mb-6 border border-gray-800">
              <p className="text-center text-md font-bold text-[#74b9ff] mb-2">
                {puntosProcesados.toLocaleString()} /{" "}
                {totalPuntos.toLocaleString()}
              </p>
              <div className="flex flex-col gap-1 text-sm font-semibold">
                <span className="text-[#00ff88]">
                  🟢 Dentro: {puntosDentro.toLocaleString()}
                </span>
                <span className="text-[#ff4757]">
                  🔴 Fuera: {(puntosProcesados - puntosDentro).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-gray-700">
            <div>
              <p className="text-xs text-[#ced6e0]">Pi Real (Analítico):</p>
              <p className="text-md font-bold text-white">
                {Math.PI.toFixed(6)}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#ced6e0]">Pi Estimado (Numérico):</p>
              <p className="text-2xl font-black text-[#eccc68]">
                {puntosProcesados > 0 ? piEstimado.toFixed(6) : "-"}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#ced6e0]">Error Porcentual:</p>
              <p className="text-lg font-bold text-[#ff6b6b]">
                {puntosProcesados > 0 ? `${errorRelativo.toFixed(4)}%` : "-"}
              </p>
            </div>
          </div>
        </div>

        {/* PANEL 2: ESPACIO GEOMÉTRICO */}
        <div className="md:col-span-4 bg-[#1e272e] flex flex-col items-center justify-center p-2">
          <div className="bg-[#2f3542] p-4 rounded-xl shadow-xl border border-gray-700">
            <canvas
              ref={canvasGeomRef}
              width={380}
              height={380}
              className="bg-[#2f3542] rounded-lg"
            />
          </div>
        </div>

        {/* PANEL 3: GRÁFICO DE CONVERGENCIA */}
        <div className="md:col-span-4 bg-[#1e272e] flex flex-col items-center justify-center p-2">
          <div className="bg-[#2f3542] p-4 rounded-xl shadow-xl border border-gray-700">
            <canvas
              ref={canvasErrorRef}
              width={380}
              height={380}
              className="bg-[#2f3542] rounded-lg"
            />
          </div>
        </div>

      </div>
    </div>
  );
}