/* PITBOX — datos de demostración. Todo el contenido es simulado. */
const DB = {
  today: "2026-11-09T09:41:00",
  owner: { name: "Garaje demo", email: "demo@pitbox.app", initials: "GD" },

  plans: {
    annual: { id: "annual", name: "Pro anual", price: "24,99 €", period: "/ año", note: "Cancela cuando quieras" },
    lifetime: { id: "lifetime", name: "Pro de por vida", price: "49,99 €", period: "pago único", note: "Un pago, todos tus coches" }
  },

  vehicles: [
    {
      id: "golf",
      name: "Golf GTI Mk7",
      trim: "Performance · 5 puertas",
      year: 2016,
      plate: "8421 KLM",
      vin: "WVWZZZAUZGW214876",
      engineCode: "CJXC",
      engine: "2.0 TSI EA888 Gen3",
      chassis: "MQB",
      power: "230 CV",
      torque: "350 Nm",
      gearbox: "DSG 6v · DQ250",
      fuel: "Gasolina",
      km: 128430,
      oilSpec: "5W-30 · VW 504 00",
      image: "assets/car-hero.png",
      accent: "#ff5a1f",
      primary: true,
      components: [
        {
          id: "oil", name: "Aceite de motor", icon: "oil", group: "Motor",
          intervalKm: 15000, lastKm: 118200, lastDate: "2025-01-18",
          ref: "06L115562", torque: "30 Nm (tapón) · 25 Nm (carcasa)",
          spec: "5W-30 · VW 504 00", note: "Intervalo fijo recomendado para uso urbano. 5,7 L con filtro."
        },
        {
          id: "air", name: "Filtro de aire", icon: "air", group: "Motor",
          intervalKm: 60000, lastKm: 98000, lastDate: "2024-06-14",
          ref: "5Q0129620D", torque: "—", spec: "Panel de papel · caja MQB",
          note: "Revisar antes si circulas por zonas con mucho polvo."
        },
        {
          id: "spark", name: "Bujías de encendido", icon: "spark", group: "Encendido",
          intervalKm: 60000, lastKm: 98000, lastDate: "2024-06-14",
          ref: "06K905601B", torque: "23 Nm", spec: "4 uds. · separación 0,8 mm",
          note: "Usa referencia NGK ILZKBR7B8DG como proveedor OEM."
        },
        {
          id: "chain", name: "Cadena de distribución", icon: "chain", group: "Motor",
          intervalKm: 180000, lastKm: 0, lastDate: "—",
          ref: "06K109158K (kit)", torque: "—", spec: "Cadena + tensor + patines",
          note: "Inspección visual recomendada a 150.000 km. El tensor es el punto débil del EA888 Gen3."
        },
        {
          id: "brakefluid", name: "Líquido de frenos", icon: "fluid", group: "Fluidos",
          intervalKm: 60000, intervalMonths: 24, lastKm: 96400, lastDate: "2024-03-09",
          ref: "DOT 4 · 1 L", torque: "—", spec: "Punto de ebullición ≥ 230 °C",
          note: "La humedad eleva el punto de ebullición. Sustituir cada 2 años aunque no llegues al kilometraje."
        },
        {
          id: "pump", name: "Bomba de agua + termostato", icon: "pump", group: "Refrigeración",
          intervalKm: 100000, lastKm: 82000, lastDate: "2023-11-04",
          ref: "06L121111H", torque: "9 Nm", spec: "Módulo termostato integrado",
          note: "Sustituida preventivamente por fuga en el cuerpo del termostato."
        },
        {
          id: "dsg", name: "Aceite DSG DQ250", icon: "dsg", group: "Transmisión",
          intervalKm: 60000, lastKm: 90000, lastDate: "2024-02-16",
          ref: "02E305051C (kit)", torque: "45 Nm (tapón)",
          spec: "G 052 529 A2 · 5,5 L", note: "Filtro y junta incluidos en el kit. Nivel por rebosadero a 35 °C."
        },
        {
          id: "pads", name: "Pastillas delanteras", icon: "brake", group: "Frenos",
          intervalKm: 45000, lastKm: 112000, lastDate: "2024-11-02",
          ref: "5Q0698151K", torque: "30 Nm (guías)",
          spec: "Brembo P 85 146 · 340 mm", note: "Discos por encima del mínimo (22,8 mm). Revisar labio exterior."
        },
        {
          id: "arms", name: "Brazos de suspensión", icon: "arm", group: "Chasis",
          intervalKm: 60000, lastKm: 90000, lastDate: "2024-02-16",
          ref: "5Q0407151", torque: "70 Nm + 180°",
          spec: "Rótula y silentblocks delanteros", note: "Revisar holguras con el coche elevado. Común ruido de 'clonk' en badenes."
        }
      ],
      services: [
        {
          id: "s1", date: "2025-01-18", km: 118200, type: "Aceite y filtro",
          group: "Motor", parts: "5W-30 VW 504 00 · filtro 06L115562",
          cost: 96, shop: "Bosch Service · Madrid", note: "Intervalo fijo 15.000 km."
        },
        {
          id: "s2", date: "2024-11-02", km: 112000, type: "Pastillas delanteras",
          group: "Frenos", parts: "Brembo P 85 146 · 5Q0698151K",
          cost: 148, shop: "AutoReparación", note: "Discos dentro de tolerancia."
        },
        {
          id: "s3", date: "2024-06-14", km: 98000, type: "Bujías + filtro de aire",
          group: "Encendido", parts: "NGK ILZKBR7B8DG ×4 · 5Q0129620D",
          cost: 122, shop: "Taller Norte", note: "Sin fallos de encendido en centralita."
        },
        {
          id: "s4", date: "2024-03-09", km: 96400, type: "Líquido de frenos",
          group: "Fluidos", parts: "DOT 4 · purgado completo",
          cost: 55, shop: "Taller Norte", note: "Humedad medida 2,1 %."
        },
        {
          id: "s5", date: "2024-02-16", km: 90000, type: "Aceite DSG + filtro",
          group: "Transmisión", parts: "Kit 02E305051C · G 052 529 A2",
          cost: 210, shop: "Especialista DSG", note: "Nivel ajustado a 35 °C."
        },
        {
          id: "s6", date: "2023-11-04", km: 82000, type: "Bomba de agua + termostato",
          group: "Refrigeración", parts: "06L121111H · G12evo",
          cost: 410, shop: "Taller Norte", note: "Sustitución preventiva por microfuga."
        }
      ]
    },
    {
      id: "a4",
      name: "Audi A4 Avant B9",
      trim: "Advanced · 2.0 TDI",
      year: 2018,
      plate: "7710 MNS",
      vin: "WAUZZZF48JA112904",
      engineCode: "DETA",
      engine: "2.0 TDI 190 CV",
      chassis: "MLBevo",
      demoLocked: true,
      power: "190 CV",
      torque: "400 Nm",
      gearbox: "S tronic 7v · DL382",
      fuel: "Diésel",
      km: 184900,
      oilSpec: "5W-30 · VW 507 00",
      image: "assets/car-hero.png",
      accent: "#3e7bfa",
      components: [
        {
          id: "oil", name: "Aceite de motor", icon: "oil", group: "Motor",
          intervalKm: 15000, lastKm: 178000, lastDate: "2026-02-14",
          ref: "059198405", torque: "30 Nm (tapón)", spec: "5W-30 · VW 507 00",
          note: "Intervalo fijo recomendado: 15.000 km."
        },
        {
          id: "fuel", name: "Filtro de gasóleo", icon: "air", group: "Motor",
          intervalKm: 60000, lastKm: 160000, lastDate: "2024-10-03",
          ref: "8W0127401", torque: "25 Nm", spec: "Cartucho · purga automática",
          note: "Purgar el circuito tras la sustitución."
        },
        {
          id: "chain", name: "Correa de distribución", icon: "chain", group: "Motor",
          intervalKm: 210000, lastKm: 0, lastDate: "—",
          ref: "04L109119K (kit)", torque: "—", spec: "Correa + tensor + bomba",
          note: "Sustituir a 210.000 km o 10 años."
        },
        {
          id: "brakefluid", name: "Líquido de frenos", icon: "fluid", group: "Fluidos",
          intervalKm: 60000, intervalMonths: 24, lastKm: 171000, lastDate: "2025-02-20",
          ref: "DOT 4 · 1 L", torque: "—", spec: "Punto de ebullición ≥ 230 °C",
          note: "Sustituir cada 2 años."
        },
        {
          id: "pads", name: "Pastillas delanteras", icon: "brake", group: "Frenos",
          intervalKm: 45000, lastKm: 165000, lastDate: "2025-04-12",
          ref: "8W0698151AC", torque: "30 Nm (guías)", spec: "ATE · 338 mm",
          note: "Revisar discos en cada cambio."
        }
      ],
      services: [
        {
          id: "a1", date: "2026-02-14", km: 178000, type: "Aceite y filtro",
          group: "Motor", parts: "5W-30 VW 507 00 · 059198405",
          cost: 132, shop: "Servicio oficial", note: "Cambio anual por kilometraje."
        },
        {
          id: "a2", date: "2025-04-12", km: 165000, type: "Pastillas delanteras",
          group: "Frenos", parts: "ATE 8W0698151AC",
          cost: 176, shop: "Taller Norte", note: "Discos con 24,1 mm."
        }
      ]
    }
  ],

  engineProfiles: [
    {
      code: "DNFB", label: "Golf VIII 1.5 eTSI", spec: "2022 · 150 CV · MQB Evo",
      name: "Golf VIII", trim: "Life · 5 puertas", year: 2022,
      engine: "1.5 eTSI 150 CV", chassis: "MQB Evo", power: "150 CV", torque: "250 Nm",
      gearbox: "DSG 7v · DQ200", fuel: "Gasolina", oilSpec: "0W-20 · VW 508 00",
      accent: "#8e9aa0",
      components: [
        { id: "oil", name: "Aceite de motor", icon: "oil", group: "Motor", intervalKm: 15000, ref: "06L115562", torque: "30 Nm", spec: "0W-20 · VW 508 00", note: "Intervalo fijo de 15.000 km." },
        { id: "air", name: "Filtro de aire", icon: "air", group: "Motor", intervalKm: 60000, ref: "5Q0129620D", torque: "—", spec: "Panel MQB Evo", note: "Revisar visualmente cada 20.000 km." },
        { id: "spark", name: "Bujías", icon: "spark", group: "Encendido", intervalKm: 60000, ref: "06K905601B", torque: "23 Nm", spec: "4 uds. · 0,8 mm", note: "Sustituir sin esperar a fallo de encendido." },
        { id: "brakefluid", name: "Líquido de frenos", icon: "fluid", group: "Fluidos", intervalKm: 60000, intervalMonths: 24, ref: "DOT 4 · 1 L", torque: "—", spec: "≥ 230 °C", note: "Sustituir cada 2 años." },
        { id: "pads", name: "Pastillas delanteras", icon: "brake", group: "Frenos", intervalKm: 45000, ref: "5Q0698151K", torque: "30 Nm", spec: "ATE · 340 mm", note: "Revisar junto a los discos." }
      ]
    },
    {
      code: "CJXC", label: "Golf GTI 2.0 TSI", spec: "2016–2020 · 230 CV · EA888 Gen3",
      name: "Golf GTI Mk7", trim: "Performance · 5 puertas", year: 2016,
      engine: "2.0 TSI EA888 Gen3", chassis: "MQB", power: "230 CV", torque: "350 Nm",
      gearbox: "DSG 6v · DQ250", fuel: "Gasolina", oilSpec: "5W-30 · VW 504 00",
      accent: "#ff5a1f"
    },
    {
      code: "DETA", label: "Audi A4 2.0 TDI", spec: "2018 · 190 CV · MLBevo",
      name: "Audi A4 Avant B9", trim: "Advanced · 2.0 TDI", year: 2018,
      engine: "2.0 TDI 190 CV", chassis: "MLBevo", power: "190 CV", torque: "400 Nm",
      gearbox: "S tronic 7v · DL382", fuel: "Diésel", oilSpec: "5W-30 · VW 507 00",
      accent: "#3e7bfa"
    },
    {
      code: "GEN", label: "Genérico gasolina", spec: "Multimarca · 110 CV · 1.6",
      name: "Mi coche", trim: "Gasolina · manual", year: 2012,
      engine: "1.6 gasolina 110 CV", chassis: "Multimarca", power: "110 CV", torque: "155 Nm",
      gearbox: "Manual 6v", fuel: "Gasolina", oilSpec: "5W-30 · ACEA A3/B4",
      accent: "#8e9aa0",
      components: [
        { id: "oil", name: "Aceite de motor", icon: "oil", group: "Motor", intervalKm: 15000, ref: "Según motor", torque: "25 Nm (tapón)", spec: "5W-30 · ACEA A3/B4", note: "Ajusta la referencia al motor real del coche." },
        { id: "air", name: "Filtro de aire", icon: "air", group: "Motor", intervalKm: 30000, ref: "Panel universal", torque: "—", spec: "Panel de papel", note: "Revisar antes en zonas de polvo." },
        { id: "spark", name: "Bujías", icon: "spark", group: "Encendido", intervalKm: 60000, ref: "4 uds. · NGK", torque: "20 Nm", spec: "Separación 0,9 mm", note: "Sustituir el juego completo." },
        { id: "brakefluid", name: "Líquido de frenos", icon: "fluid", group: "Fluidos", intervalKm: 60000, intervalMonths: 24, ref: "DOT 4 · 1 L", torque: "—", spec: "≥ 230 °C", note: "Sustituir cada 2 años." },
        { id: "pads", name: "Pastillas delanteras", icon: "brake", group: "Frenos", intervalKm: 45000, ref: "Juego delantero", torque: "30 Nm", spec: "Según pinza", note: "Revisar discos en cada cambio." }
      ]
    }
  ],

  faults: {
    CJXC: [
      {
        id: "chain", title: "Tensor de cadena de distribución", severity: "alta", cases: 3420,
        symptom: "Traqueteo metálico de 2–3 s al arrancar en frío, sobre todo tras varios días parado.",
        check: "Inspección del tensor y patín a 150.000 km. Comprobar que el ruido no persiste en caliente.",
        part: "06K109158K", band: "0,9 – 1,6 kHz", icon: "chain"
      },
      {
        id: "pump", title: "Bomba de agua y termostato", severity: "media", cases: 2180,
        symptom: "Pérdida de refrigerante, olor dulce y testigo de temperatura intermitente.",
        check: "Buscar restos de G12evo en el cuerpo del termostato y revisar presión del circuito.",
        part: "06L121111H", band: "2,1 – 2,8 kHz", icon: "pump"
      },
      {
        id: "pcv", title: "Válvula PCV / consumo de aceite", severity: "media", cases: 1840,
        symptom: "Ralentí irregular, silbido en la tapa de balancines y consumo superior a 0,5 L/1.000 km.",
        check: "Prueba de vacío en la tapa de válvulas y revisión del diafragma de la PCV.",
        part: "06L103495Q", band: "3,2 – 4,5 kHz", icon: "vacuum"
      },
      {
        id: "coil", title: "Bobinas de encendido", severity: "baja", cases: 960,
        symptom: "Tirones bajo carga, fallo de encendido y testigo de motor.",
        check: "Leer contadores de fallo por cilindro y permutar bobinas para confirmar.",
        part: "06L905110H", band: "—", icon: "spark"
      }
    ],
    DETA: [
      {
        id: "dpf", title: "Filtro de partículas (DPF)", severity: "media", cases: 1260,
        symptom: "Regeneraciones frecuentes, testigo de DPF y aumento de consumo en trayectos cortos.",
        check: "Leer carga de ceniza y diferencial de presión. Valorar limpieza o sustitución.",
        part: "8W0131701", band: "—", icon: "filter"
      },
      {
        id: "egr", title: "Válvula EGR", severity: "baja", cases: 980,
        symptom: "Tirones a bajo régimen y humo negro intermitente.",
        check: "Revisar carbonilla en la válvula y hacer prueba de estanqueidad.",
        part: "04L131501", band: "—", icon: "vacuum"
      }
    ]
  },

  parts: [
    {
      id: "spark",
      name: "Bujía de encendido",
      category: "Encendido",
      oem: "06K905601B",
      componentId: "spark",
      fitment: "Golf VII GTI · 2.0 TSI CJXC (2013–2020)",
      engines: ["CJXC"],
      diagram: null,
      priceFrom: 11.9,
      specs: [
        ["Par de apriete", "23 Nm"],
        ["Separación", "0,8 mm (preajustada)"],
        ["Cantidad", "4 uds."],
        ["Roscado", "M12 × 1,25"]
      ],
      compat: ["Audi A3 8V S3", "Seat León Cupra 5F", "Škoda Octavia vRS 5E", "VW Golf VII R"],
      offers: [
        { brand: "NGK", ref: "ILZKBR7B8DG", price: 12.4, shop: "Autodoc", badge: "Proveedor OEM" },
        { brand: "Bosch", ref: "ZR5TPP330", price: 11.9, shop: "Oscaro", badge: "Equivalente" },
        { brand: "Denso", ref: "IXU27", price: 14.2, shop: "Endado", badge: "Equivalente" },
        { brand: "VW Original", ref: "06K905601B", price: 21.5, shop: "Concesionario", badge: "OEM" }
      ],
      note: "Las bujías NGK son el proveedor de origen en la mayoría de unidades CJXC. Cambiar siempre las cuatro."
    },
    {
      id: "oilfilter",
      name: "Filtro de aceite",
      category: "Motor",
      oem: "06L115562",
      componentId: "oil",
      fitment: "Golf VII · 2.0 TSI EA888 Gen3",
      engines: ["CJXC"],
      diagram: null,
      priceFrom: 7.2,
      specs: [
        ["Par de apriete", "25 Nm (carcasa)"],
        ["Tipo", "Cartucho de papel"],
        ["Junta", "Incluida"],
        ["Cambio", "Con cada aceite"]
      ],
      compat: ["Audi S3 8V", "Seat León Cupra", "VW Passat B8 2.0 TSI", "Škoda Superb 3V"],
      offers: [
        { brand: "Mann-Filter", ref: "HU 6013 z", price: 8.9, shop: "Autodoc", badge: "Proveedor OEM" },
        { brand: "Mahle", ref: "OX 826D", price: 7.2, shop: "Oscaro", badge: "Equivalente" },
        { brand: "VW Original", ref: "06L115562", price: 13.8, shop: "Concesionario", badge: "OEM" }
      ],
      note: "Lubrica la junta nueva con aceite limpio antes de montar. No aprietes la carcasa en seco."
    },
    {
      id: "pads",
      name: "Pastillas de freno delanteras",
      category: "Frenos",
      oem: "5Q0698151K",
      componentId: "pads",
      fitment: "Golf VII GTI · frenos 340 mm",
      engines: ["CJXC"],
      diagram: "brake",
      priceFrom: 42.5,
      specs: [
        ["Par de apriete", "30 Nm (guías)"],
        ["Discos", "340 × 30 mm"],
        ["Sensor de desgaste", "Incluido"],
        ["Eje", "Delantero"]
      ],
      compat: ["Audi A3 8V 2.0 TFSI", "Seat León Cupra 5F", "Škoda Octavia vRS", "VW Golf VII R"],
      offers: [
        { brand: "Brembo", ref: "P 85 146", price: 48.9, shop: "Autodoc", badge: "Proveedor OEM" },
        { brand: "ATE", ref: "13.0460-2762.2", price: 46.2, shop: "Oscaro", badge: "Equivalente" },
        { brand: "TRW", ref: "GDB1550", price: 42.5, shop: "Recambios24", badge: "Equivalente" },
        { brand: "VW Original", ref: "5Q0698151K", price: 74.0, shop: "Concesionario", badge: "OEM" }
      ],
      note: "Verifica el desgaste del disco antes de montar pastillas nuevas. Sustituye los tornillos de guía si vienen en el kit."
    },
    {
      id: "pump",
      name: "Bomba de agua + termostato",
      category: "Refrigeración",
      oem: "06L121111H",
      componentId: "pump",
      fitment: "Golf VII GTI · 2.0 TSI CJXC",
      engines: ["CJXC"],
      diagram: null,
      priceFrom: 58.0,
      specs: [
        ["Par de apriete", "9 Nm"],
        ["Refrigerante", "G12evo · 7,5 L"],
        ["Incluye", "Cuerpo de termostato"],
        ["Tipo", "Módulo integrado"]
      ],
      compat: ["Audi S3 8V", "Seat León Cupra 5F", "Škoda Octavia vRS 5E"],
      offers: [
        { brand: "Graf", ref: "PA 1423", price: 68.5, shop: "Autodoc", badge: "Proveedor OEM" },
        { brand: "Mahle", ref: "TX 238 87", price: 58.0, shop: "Oscaro", badge: "Equivalente" },
        { brand: "VW Original", ref: "06L121111H", price: 112.0, shop: "Concesionario", badge: "OEM" }
      ],
      note: "Fallo conocido por microfugas en la junta del termostato. Sustituir también el refrigerante."
    },
    {
      id: "arm",
      name: "Brazo de suspensión delantero",
      category: "Chasis",
      oem: "5Q0407151",
      componentId: "arms",
      fitment: "Golf VII · plataforma MQB",
      engines: ["CJXC"],
      diagram: "suspension",
      priceFrom: 54.0,
      specs: [
        ["Par de apriete", "70 Nm + 180°"],
        ["Rótula", "Integrada"],
        ["Silentblocks", "Incluidos"],
        ["Lado", "Delantero"]
      ],
      compat: ["Audi A3 8V", "Seat León 5F", "Škoda Octavia 5E", "VW Golf VII"],
      offers: [
        { brand: "Lemförder", ref: "35400 01", price: 69.9, shop: "Autodoc", badge: "Proveedor OEM" },
        { brand: "Moog", ref: "VV-WP-13749", price: 54.0, shop: "Oscaro", badge: "Equivalente" },
        { brand: "VW Original", ref: "5Q0407151", price: 98.5, shop: "Concesionario", badge: "OEM" }
      ],
      note: "Apretar silentblocks con el vehículo a altura de marcha para evitar torsiones prematuras."
    },
    {
      id: "airfilter",
      name: "Filtro de aire",
      category: "Motor",
      oem: "5Q0129620D",
      componentId: "air",
      fitment: "Golf VII GTI · 2.0 TSI CJXC",
      engines: ["CJXC"],
      diagram: null,
      priceFrom: 9.4,
      specs: [
        ["Par de apriete", "—"],
        ["Tipo", "Panel"],
        ["Caja", "MQB"],
        ["Cambio", "Cada 60.000 km"]
      ],
      compat: ["Audi A3 8V", "Seat León 5F", "Škoda Octavia 5E", "VW Golf VII"],
      offers: [
        { brand: "Mann-Filter", ref: "C 30 130", price: 12.2, shop: "Autodoc", badge: "Proveedor OEM" },
        { brand: "Bosch", ref: "F 026 400 691", price: 9.4, shop: "Oscaro", badge: "Equivalente" },
        { brand: "VW Original", ref: "5Q0129620D", price: 18.0, shop: "Concesionario", badge: "OEM" }
      ],
      note: "No sopletear filtros de papel: daña la microfibra. Sustituir si presenta humedad o aceite."
    }
  ],

  diagnostics: {
    default: [
      {
        id: "alt", label: "Rodamiento / polea del alternador", pct: 68, band: "1,8 – 2,4 kHz",
        desc: "Ruido cíclico ligado al giro de la correa auxiliar. Aumenta con el régimen y desaparece al retirar la correa.",
        steps: [
          "Con el motor al ralentí, localiza el alternador y la polea tensora.",
          "Acerca el micrófono a 20 cm y compara el ruido antes y después de retirar la correa auxiliar.",
          "Con el motor parado, gira la polea a mano: debe girar libre en un sentido y bloquear en el otro.",
          "Comprueba juego axial del eje del alternador. Juego o rugosidad = rodamiento fatigado."
        ]
      },
      {
        id: "chain", label: "Tensor / cadena de distribución", pct: 18, band: "0,9 – 1,6 kHz",
        desc: "Traqueteo de baja frecuencia al arrancar. Compatible con el punto débil del EA888 Gen3.",
        steps: [
          "Reproduce el arranque en frío y escucha los primeros 2–3 segundos.",
          "Localiza el ruido en la tapa de distribución (lado derecho del motor).",
          "No circules con un traqueteo persistente: puede saltar un diente y provocar daño de válvulas.",
          "Verifica el tensor y los patines en taller antes de 150.000 km."
        ]
      },
      {
        id: "vac", label: "Fuga de vacío", pct: 9, band: "3,2 – 4,5 kHz",
        desc: "Silbido agudo y estable, más audible al ralentí. Suele venir de PCV, manguitos o servofreno.",
        steps: [
          "Con el motor al ralentí, pulveriza agua jabonosa en manguitos y juntas.",
          "Aprieta las abrazaderas y escucha si el silbido cambia.",
          "Prueba a tapar la PCV con cuidado: si el ralentí se estabiliza, el diafragma está roto.",
          "No sustituyas piezas al azar: confirma la zona con una prueba de humo."
        ]
      }
    ],
    chain: [
      {
        id: "chain", label: "Tensor / cadena de distribución", pct: 74, band: "0,9 – 1,6 kHz",
        desc: "Patrón acústico compatible con el tensor del EA888 Gen3. Prioridad alta por riesgo de salto.",
        steps: [
          "Reproduce el arranque en frío y escucha los primeros 2–3 segundos.",
          "Localiza el ruido en la tapa de distribución (lado derecho del motor).",
          "No circules con un traqueteo persistente: puede saltar un diente y provocar daño de válvulas.",
          "Verifica el tensor y los patines en taller antes de 150.000 km."
        ]
      },
      {
        id: "alt", label: "Rodamiento / polea del alternador", pct: 14, band: "1,8 – 2,4 kHz",
        desc: "Ruido alternativo menos probable. Descartar retirando la correa auxiliar.",
        steps: [
          "Retira la correa auxiliar y reproduce el arranque.",
          "Si el ruido desaparece, revisa poleas y rodamientos.",
          "Gira el alternador a mano con el motor parado."
        ]
      },
      {
        id: "vac", label: "Fuga de vacío", pct: 6, band: "3,2 – 4,5 kHz",
        desc: "Silbido agudo estable. Menos compatible con la firma registrada.",
        steps: [
          "Revisa manguitos de admisión y PCV.",
          "Haz una prueba de humo en taller."
        ]
      }
    ]
  },

  visualResults: {
    disc: {
      title: "Disco de freno delantero",
      status: "warning", statusLabel: "Cambio próximo",
      confidence: 93,
      headline: "Desgaste avanzado en la pista exterior",
      metrics: [
        ["Espesor medido", "22,8 mm"],
        ["Nuevo / mínimo", "25,0 / 22,0 mm"],
        ["Labio exterior", "0,7 mm"],
        ["Vida estimada", "≈ 6.000 km"]
      ],
      note: "El labio y el rayado son compatibles con desgaste normal. Planifica el cambio de discos y pastillas en el próximo servicio."
    },
    pads: {
      title: "Pastillas de freno delanteras",
      status: "ok", statusLabel: "Dentro de tolerancia",
      confidence: 91,
      headline: "Espesor uniforme en ambos ejes",
      metrics: [
        ["Espesor medio", "8,2 mm"],
        ["Nuevo / mínimo", "12,0 / 3,0 mm"],
        ["Desgaste", "46 %"],
        ["Vida estimada", "≈ 15.000 km"]
      ],
      note: "Desgaste uniforme sin cristalización visible. Revisa de nuevo en 10.000 km."
    }
  }
};
