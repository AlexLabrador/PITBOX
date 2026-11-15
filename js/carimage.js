/* PITBOX — foto de referencia del modelo (Wikimedia Commons) */
(function () {
  "use strict";

  const API = "https://commons.wikimedia.org/w/api.php";
  const CACHE_KEY = "pitbox.carphotos.v1";
  const CACHE_TTL = 30 * 24 * 60 * 60 * 1000;
  const THUMB_WIDTH = 1200;

  /* Un archivo revisado por generación. Nunca se busca por texto libre: una
     búsqueda puede devolver otra generación o un acabado distinto. Si el año
     del vehículo no cae en ningún rango, no se muestra foto (placeholder). */
  /* MODELS:START */
  const MODELS = {
    "alfa-romeo|147": [
      { gen: "937", from: 2000, to: 2010, file: "Alfa Romeo 147 3-door silver front.JPG" }
    ],
    "alfa-romeo|156": [
      { gen: "932", from: 1997, to: 2006, file: "Alfa-Romeo-156-Giugiaro.jpg" }
    ],
    "alfa-romeo|159": [
      { gen: "939", from: 2005, to: 2011, file: "Alfa Romeo 159 2.2 JTS Villa d'ESTE (ABA-93922) front.jpg" }
    ],
    "alfa-romeo|4c": [
      { gen: "960", from: 2013, to: 2020, file: "2015 Alfa Romeo 4C Coupé in Rosso Competizione, front left.jpg" }
    ],
    "alfa-romeo|brera": [
      { gen: "939", from: 2005, to: 2010, file: "Alfa Romeo Brera front.JPG" }
    ],
    "alfa-romeo|giulia": [
      { gen: "952", from: 2016, to: 2026, file: "Prague 2017 Alfa Romeo Giulia 1.jpg" }
    ],
    "alfa-romeo|giulietta": [
      { gen: "940", from: 2010, to: 2020, file: "Alfa Romeo Giulietta Sportiva (ABA-940141) front.JPG" }
    ],
    "alfa-romeo|gt": [
      { gen: "937", from: 2003, to: 2010, file: "Alfa Romeo GT front 20080228.jpg" }
    ],
    "alfa-romeo|junior": [
      { gen: "966", from: 2024, to: 2026, file: "Alfa Romeo Junior Auto Zuerich 2024 DSC 6376.jpg" }
    ],
    "alfa-romeo|mito": [
      { gen: "955", from: 2008, to: 2018, file: "2014 Alfa Romeo MiTo 1.4 front.jpg" }
    ],
    "alfa-romeo|stelvio": [
      { gen: "949", from: 2017, to: 2026, file: "Alfa Romeo STELVIO FIRST EDITION (ABA-94920) front.jpg" }
    ],
    "alfa-romeo|tonale": [
      { gen: "965", from: 2022, to: 2026, file: "Alfa Romeo Tonale PHEV 1X7A6811.jpg" }
    ],
    "audi|a1": [
      { gen: "8x", from: 2010, to: 2018, file: "Audi A1 front Poznan 2011.jpg" },
      { gen: "gb", from: 2018, to: 2026, file: "2019 Audi A1 in Chronos Grey Metallic, front left, 06-08-2025.jpg" }
    ],
    "audi|a3": [
      { gen: "8l", from: 1996, to: 2003, file: "Audi A3 1.8 T (8L, Facelift) – Frontansicht, 29. Mai 2014, Düsseldorf.jpg" },
      { gen: "8p", from: 2003, to: 2013, file: "Audi A3 1.2 TFSI Ambition S-line (8P, 3. Facelift) – Frontansicht, 17. Mai 2011, Velbert.jpg" },
      { gen: "8v", from: 2012, to: 2020, file: "Audi A3 8V Sportback Sanming 01 2022-12-01.jpg" },
      { gen: "8y", from: 2020, to: 2026, file: "Audi A3 Sportback 30 TFSI advanced (3AA-GYDLA) front.jpg" }
    ],
    "audi|a4": [
      { gen: "b5", from: 1994, to: 2001, file: "Audi A4 sedan 1.8T quattro (B5) front.JPG" },
      { gen: "b6", from: 2000, to: 2005, file: "2003 Audi A4 - 1896cc 1.9 (130PS) TDI Diesel - 03-12-2023, Front Left.jpg" },
      { gen: "b7", from: 2004, to: 2008, file: "Audi A4 B7 front.jpg" },
      { gen: "b8", from: 2007, to: 2015, file: "Audi A4 (B8) Washington DC Metro Area, USA.jpg" },
      { gen: "b9", from: 2015, to: 2026, file: "Audi A4 Avant B9 (FL) 1X7A6421.jpg" }
    ],
    "audi|a5": [
      { gen: "8t", from: 2007, to: 2016, file: "Audi A5 front 20080225.jpg" },
      { gen: "f5", from: 2016, to: 2024, file: "Audi A5 Sportback front.jpg" },
      { gen: "b10", from: 2024, to: 2026, file: "Audi A5 B10 DSC 7314.jpg" }
    ],
    "audi|a6": [
      { gen: "c4", from: 1994, to: 1997, file: "Audi A6 C4.jpg" },
      { gen: "c5", from: 1997, to: 2005, file: "Audi A6 2.4 (C5) front.JPG" },
      { gen: "c6", from: 2004, to: 2011, file: "Audi A6 C6 front 20070518.jpg" },
      { gen: "c7", from: 2010, to: 2018, file: "Audi A6 hybrid (C7) front.JPG" },
      { gen: "c8", from: 2018, to: 2026, file: "2019 Audi A6 55 TFSI Quattro Progressiv Quattro S-Line in Daytona Grey Pearlescent, Front Left, 11-25-2022.jpg" }
    ],
    "audi|a7": [
      { gen: "4g", from: 2010, to: 2017, file: "2017 Audi A7 Sportback Front.jpg" },
      { gen: "4k", from: 2018, to: 2026, file: "2018 Audi A7 S Line 50 TDi Quattro 3.0 Front.jpg" }
    ],
    "audi|a8": [
      { gen: "d3", from: 2002, to: 2010, file: "Audi A8 D3 front.jpg" },
      { gen: "d4", from: 2010, to: 2017, file: "2015 Audi A8 Front.jpeg" },
      { gen: "d5", from: 2017, to: 2026, file: "2018 Audi A8 55 TFSi Quattro Front.jpg" }
    ],
    "audi|q2": [
      { gen: "ga", from: 2016, to: 2026, file: "2017 Audi Q2 Sport TDi 1.6 Front.jpg" }
    ],
    "audi|q3": [
      { gen: "8u", from: 2011, to: 2018, file: "2018 Audi Q3 S Line Black Edition TFSI - 1395cc 1.4 (150PS) Petrol - Misano Red - 04-2024, Front.jpg" },
      { gen: "f3", from: 2018, to: 2026, file: "Audi Q3 1.4 35 TFSI 2021 (2).jpg" }
    ],
    "audi|q5": [
      { gen: "8r", from: 2008, to: 2017, file: "2013 Audi Q5 SE TFSI Quattro - 1984cc 2.0 (225PS) Petrol - White - 06-2024, Front.jpg" },
      { gen: "fy", from: 2017, to: 2026, file: "2018 Audi Q5 1 (32696408375).jpg" }
    ],
    "audi|q7": [
      { gen: "4l", from: 2005, to: 2015, file: "Audi Q7 front 20071017.jpg" },
      { gen: "4m", from: 2015, to: 2026, file: "Audi Q7 4M quattro 2020 (1).jpg" }
    ],
    "audi|q8": [
      { gen: "4m", from: 2018, to: 2024, file: "2019 Audi Q8 Front.jpg" },
      { gen: "4m8", from: 2024, to: 2026, file: "Audi, EMS 2024, Essen (P1031581).jpg" }
    ],
    "audi|tt": [
      { gen: "8n", from: 1998, to: 2006, file: "Audi TT Roadster I.Generation front.jpg" },
      { gen: "8j", from: 2006, to: 2014, file: "Audi TT front 20080118.jpg" },
      { gen: "8s", from: 2014, to: 2023, file: "Audi TT Coupe (8S) front.JPG" }
    ],
    "audi|r8": [
      { gen: "42", from: 2006, to: 2015, file: "Audi R8 front 20080123.jpg" },
      { gen: "4s", from: 2015, to: 2024, file: "Audi R8 2017 Convertible.jpg" }
    ],
    "audi|e-tron": [
      { gen: "ge", from: 2018, to: 2023, file: "2019 Audi e-tron quattro front NYIAS 2019.jpg" }
    ],
    "audi|q4-e-tron": [
      { gen: "f4", from: 2021, to: 2026, file: "Audi Q4 e-tron 2021-2 front.jpg" }
    ],
    "audi|q8-e-tron": [
      { gen: "ge", from: 2023, to: 2026, file: "Audi Q8 e-tron IAA 2023 1X7A0616.jpg" }
    ],
    "bmw|serie-1": [
      { gen: "e87", from: 2004, to: 2011, file: "BMW 1 Series (E87) 142525.jpg" },
      { gen: "f20", from: 2011, to: 2019, file: "BMW 1-Series F20 Shishi 02 2022-09-12.jpg" },
      { gen: "f40", from: 2019, to: 2026, file: "BMW 118i M Sport (3BA-7K15) front.jpg" }
    ],
    "bmw|serie-3": [
      { gen: "e46", from: 1998, to: 2005, file: "BMW 318iA (E46) Front.jpg" },
      { gen: "e90", from: 2005, to: 2013, file: "BMW E90 LCI 3 Series Arctic Metallic (1).jpg" },
      { gen: "f30", from: 2012, to: 2019, file: "BMW 3 Series (F30), Bangladesh. (29090264638).jpg" },
      { gen: "g20", from: 2019, to: 2026, file: "BMW 3 Series 3.jpg" }
    ],
    "bmw|x1": [
      { gen: "e84", from: 2009, to: 2015, file: "BMW X1 2011 silver front.jpg" },
      { gen: "f48", from: 2015, to: 2022, file: "2020 BMW X1 sDrive18i (front), Citraland, West Surabaya.jpg" },
      { gen: "u11", from: 2022, to: 2026, file: "BMW X1 xDrive20i (U11) front.jpg" }
    ],
    "bmw|x3": [
      { gen: "e83", from: 2003, to: 2010, file: "BMW X3 E83 red front (1).jpg" },
      { gen: "f25", from: 2010, to: 2017, file: "BMW X3 M-Sport (F25); facelift (front) (2).jpg" },
      { gen: "g01", from: 2017, to: 2024, file: "2019 BMW X3 xDrive30i front.jpg" },
      { gen: "g45", from: 2024, to: 2026, file: "BMW G45 X3 20d M Sport PRO Alpine White (10).jpg" }
    ],
    "bmw|serie-2": [
      { gen: "f22", from: 2014, to: 2021, file: "BMW 2-Series Coupé (F22) 218i (2020) (53323149370).jpg" }
    ],
    "bmw|serie-4": [
      { gen: "g22", from: 2020, to: 2026, file: "BMW 4-Series Coupé (G22) 420d (2020) (53326632791).jpg" }
    ],
    "bmw|serie-5": [
      { gen: "g30", from: 2017, to: 2023, file: "BMW 5-Series (G30) 520d (2017) (53327037455).jpg" }
    ],
    "bmw|serie-7": [
      { gen: "g11", from: 2015, to: 2022, file: "BMW 7-Series (G11) 730d (2017) (53326925994).jpg" }
    ],
    "bmw|x2": [
      { gen: "f39", from: 2018, to: 2023, file: "BMW X2 xDrive20i M Sport (F39) front.jpg" }
    ],
    "bmw|x4": [
      { gen: "g02", from: 2018, to: 2026, file: "BMW X4 xDrive30i (G02, 2022) (53652312700).jpg" }
    ],
    "bmw|x5": [
      { gen: "g05", from: 2018, to: 2026, file: "BMW X5 xDrive30d (G05, 2020) (53334141714).jpg" }
    ],
    "bmw|x6": [
      { gen: "g06", from: 2019, to: 2026, file: "BMW X6 xDrive35d (G06) front.jpg" }
    ],
    "bmw|x7": [
      { gen: "g07", from: 2019, to: 2026, file: "BMW X7 xDrive40i (G07, 2021) (52858944085).jpg" }
    ],
    "bmw|z4": [
      { gen: "g29", from: 2018, to: 2026, file: "BMW Z4 sDrive20i M Sport (G29) front.jpg" }
    ],
    "bmw|i3": [
      { gen: "i01", from: 2013, to: 2022, file: "2013 BMW i3 I01 Solarorange mit Frozen Grey Metallic.jpg" }
    ],
    "bmw|i4": [
      { gen: "g26", from: 2021, to: 2026, file: "BMW i4 eDrive40 M Sport (G26) front.jpg" }
    ],
    "bmw|ix": [
      { gen: "i20", from: 2021, to: 2026, file: "BMW iX xDrive40 Air-Suspension (i20) front.jpg" }
    ],
    "bmw|ix3": [
      { gen: "g08", from: 2020, to: 2026, file: "BMW iX3 M Sport (G08) front.jpg" }
    ],
    "byd|atto-3": [
      { gen: "atto3", from: 2022, to: 2026, file: "2024 BYD Atto 3 (SC2E) in South Tangerang looking from front.jpg" }
    ],
    "citroen|c1": [
      { gen: "i", from: 2005, to: 2014, file: "Citroën C1 front.JPG" },
      { gen: "ii", from: 2014, to: 2021, file: "2014 Citroën C1 - Front.jpg" }
    ],
    "citroen|c2": [
      { gen: "i", from: 2003, to: 2009, file: "Citroën C2 front.JPG" }
    ],
    "citroen|c3": [
      { gen: "i", from: 2002, to: 2009, file: "2004 Citroen C3 Exclusive 1.6 Front.jpg" },
      { gen: "ii", from: 2009, to: 2016, file: "2011 Citroen C3 Connexion 1.4 Front.jpg" },
      { gen: "iii", from: 2016, to: 2024, file: "2018 Citroen C3 Flair PureTech - 1200cc 1.2 (110PS) Petrol - Red - 05-2024, Front.jpg" },
      { gen: "iv", from: 2024, to: 2026, file: "Citroen C3 (20251115-P1074644).jpg" }
    ],
    "citroen|c3-aircross": [
      { gen: "i", from: 2017, to: 2024, file: "2017 Citroen C3 Aircross PureTech 1.2 Front.jpg" },
      { gen: "ii", from: 2024, to: 2026, file: "Citroën C3 Aircross (2024) DSC 8767.jpg" }
    ],
    "citroen|c4": [
      { gen: "i", from: 2004, to: 2010, file: "Citroen C4 front 20070523.jpg" },
      { gen: "ii", from: 2010, to: 2018, file: "2016 Citroen C4 Feel BlueHDi 1.6 Front.jpg" },
      { gen: "iii", from: 2020, to: 2026, file: "2021 Citroen C4 Shine Front.jpg" }
    ],
    "citroen|c4-x": [
      { gen: "i", from: 2022, to: 2026, file: "Citroën C4 X front.jpg" }
    ],
    "citroen|c5-aircross": [
      { gen: "i", from: 2017, to: 2022, file: "2018 Dongfeng-Citroën C5 Aircross, front 8.9.18.jpg" },
      { gen: "i-fl", from: 2022, to: 2026, file: "Citroen C5 Aircross 2022 Facelift 1.2 130 front view.jpg" }
    ],
    "citroen|c5-x": [
      { gen: "i", from: 2021, to: 2026, file: "Citroën C5 X PureTech 130 (2022) (53048823247).jpg" }
    ],
    "citroen|c-elysee": [
      { gen: "i", from: 2013, to: 2022, file: "2014 Dongfeng-Citroën C-Elysée, front 8.10.18.jpg" }
    ],
    "citroen|berlingo": [
      { gen: "i", from: 1996, to: 2002, file: "2000 Citroen Berlingo 1.9 Front.jpg" },
      { gen: "ii", from: 2002, to: 2008, file: "Citroën Berlingo II front.JPG" },
      { gen: "iii", from: 2008, to: 2018, file: "Citroen Berlingo II (2008) front.jpg" },
      { gen: "iv", from: 2018, to: 2026, file: "2019 Citroen Berlingo Feel Puretech 1.2 Front.jpg" }
    ],
    "citroen|spacetourer": [
      { gen: "i", from: 2016, to: 2026, file: "Citroën Spacetourer Poznań Motor Show 2016 front.jpg" }
    ],
    "citroen|jumpy": [
      { gen: "i", from: 1995, to: 2007, file: "1998 Citroen Dispatch Diesel 1.9 Front.jpg" },
      { gen: "ii", from: 2007, to: 2016, file: "Citroen Jumpy front 20080326.jpg" },
      { gen: "iii", from: 2016, to: 2026, file: "2017 Citroen Dispatch 1400 2.0 Front.jpg" }
    ],
    "citroen|jumper": [
      { gen: "i", from: 1994, to: 2006, file: "Citroën Jumper Combi Comfort '02-'06.jpg" },
      { gen: "ii", from: 2006, to: 2014, file: "Citroën Jumper II front.JPG" },
      { gen: "ii-fl", from: 2014, to: 2026, file: "2014 Citroën Jumper (L2H2 body; fl).jpg" }
    ],
    "cupra|ateca": [
      { gen: "pre", from: 2018, to: 2020, file: "2019 SEAT Ateca Cupra 300 C&S 4Drive 2.0 Front.jpg" },
      { gen: "fl", from: 2020, to: 2024, file: "Auto 2024, Zurich (PANA0894).jpg" }
    ],
    "cupra|born": [
      { gen: "mk1", from: 2021, to: 2026, file: "2023 Cupra Born V1 EV - 58kWh (203PS) Electric - Glacial White - 07-2024, Front.jpg" }
    ],
    "cupra|formentor": [
      { gen: "mk1", from: 2020, to: 2024, file: "2020 Cupra Formentor VZ2 TSi 4Drive S-A 2.0 Front.jpg" },
      { gen: "mk1-fl", from: 2024, to: 2026, file: "Cupra Formentor Facelift IMG 0435.jpg" }
    ],
    "cupra|leon": [
      { gen: "mk4", from: 2020, to: 2024, file: "Cupra Leon Mk4 IMG 0036.jpg" },
      { gen: "mk4-fl", from: 2024, to: 2026, file: "Cupra Leon Mk4 ST Facelift DSC 7067.jpg" }
    ],
    "cupra|tavascan": [
      { gen: "mk1", from: 2024, to: 2026, file: "Cupra Tavascan, IAA Summit 2023, Munich (P1110731-Pano).jpg" }
    ],
    "cupra|terramar": [
      { gen: "mk1", from: 2024, to: 2026, file: "Cupra Terramar VZ DSC 8241.jpg" }
    ],
    "dacia|dokker": [
      { gen: "i", from: 2012, to: 2022, file: "Dacia Dokker (front).JPG" }
    ],
    "dacia|duster": [
      { gen: "i", from: 2010, to: 2017, file: "Dacia Duster Ambiance 1.6 16V 4x2 Artiksweiß Front.JPG" },
      { gen: "ii", from: 2017, to: 2024, file: "Dacia Duster Mk2 - Front View.jpg" },
      { gen: "iii", from: 2024, to: 2026, file: "2024 Dacia Duster front.jpg" }
    ],
    "dacia|jogger": [
      { gen: "i", from: 2021, to: 2026, file: "Dacia Jogger - Front View.jpg" }
    ],
    "dacia|lodgy": [
      { gen: "i", from: 2012, to: 2022, file: "Prague 2017 Dacia Lodgy 1.jpg" }
    ],
    "dacia|logan": [
      { gen: "i", from: 2004, to: 2012, file: "Dacia Logan Facelift front - PSM 2009.jpg" },
      { gen: "ii", from: 2012, to: 2020, file: "Dacia Logan II Front.jpg" },
      { gen: "iii", from: 2020, to: 2026, file: "2021 Dacia Logan III (front).jpg" }
    ],
    "dacia|sandero": [
      { gen: "i", from: 2008, to: 2012, file: "Dacia Sandero front - PSM 2009.jpg" },
      { gen: "ii", from: 2012, to: 2020, file: "2013 Dacia Sandero II front.JPG" },
      { gen: "iii", from: 2020, to: 2026, file: "Dacia Sandero III (France) front view.jpg" }
    ],
    "dacia|spring": [
      { gen: "i", from: 2021, to: 2024, file: "2021 Dacia Spring Electric (France) front view 01.png" },
      { gen: "i-fl", from: 2024, to: 2026, file: "Dacia Spring, Auto 2024, Zurich (PANA0752).jpg" }
    ],
    "fiat|500": [
      { gen: "312", from: 2007, to: 2024, file: "Fiat-500.jpg" },
      { gen: "500e", from: 2020, to: 2026, file: "Fiat 500e SDQ 03 2020 2797.jpg" }
    ],
    "fiat|panda": [
      { gen: "319", from: 2011, to: 2026, file: "2012 Fiat Panda Easy 1.2 Front.jpg" }
    ],
    "ford|fiesta": [
      { gen: "mk3", from: 1989, to: 1997, file: "Ford Fiesta MK3 front 20070926.jpg" },
      { gen: "mk4", from: 1995, to: 2002, file: "Ford Fiesta MK4 (1995-1999) front.jpg" },
      { gen: "mk5", from: 2002, to: 2008, file: "Ford Fiesta MK5 front 20071002.jpg" },
      { gen: "mk6", from: 2008, to: 2017, file: "2014 Ford Fiesta S hatchback in Oxford White, front right, 08-08-2026.jpg" },
      { gen: "mk7", from: 2017, to: 2023, file: "2020 Ford Fiesta ST-Line Edition EcoBoost - 999cc 1.0 (95PS) Petrol - Moondust Silver - 02-2024, Front.jpg" }
    ],
    "ford|focus": [
      { gen: "mk1", from: 1998, to: 2004, file: "Ford Focus ZX5 (4558736287).jpg" },
      { gen: "mk2", from: 2004, to: 2011, file: "Ford Focus II (Modellpflege, seit 2008) front MJ.JPG" },
      { gen: "mk3", from: 2011, to: 2018, file: "2013 Ford Focus Edge - 1560cc 1.6 Duratorq TDCi (115PS) Diesel - Micastone - 21-05-2024, Front Left.jpg" },
      { gen: "mk4", from: 2018, to: 2026, file: "Ford Focus MK4 sedan 002.jpg" }
    ],
    "ford|mondeo": [
      { gen: "mk1", from: 1993, to: 1996, file: "1993 Ford Mondeo Ghia (11917946094).jpg" },
      { gen: "mk2", from: 1996, to: 2000, file: "Ford Mondeo MK2 (1997-2000) front.jpg" },
      { gen: "mk3", from: 2000, to: 2007, file: "Ford.mondeo.mk3-black.front-by.ranger.jpg" },
      { gen: "mk4", from: 2007, to: 2014, file: "Ford Mondeo MK4 Fließheck Ghia front.JPG" },
      { gen: "mk5", from: 2014, to: 2022, file: "2015 Ford Mondeo Vignale Automatic Estate 2.0 Front.jpg" }
    ],
    "ford|puma": [
      { gen: "mk1", from: 1997, to: 2002, file: "1998 Ford Puma 1.7 16v.jpg" },
      { gen: "mk2", from: 2019, to: 2026, file: "2020 Ford Puma Titanium EcoBoost Hybrid 1.0 Front.jpg" }
    ],
    "ford|kuga": [
      { gen: "mk1", from: 2008, to: 2012, file: "Ford Kuga front 20080607.jpg" },
      { gen: "mk2", from: 2012, to: 2019, file: "2018 Ford Kuga in Magnetic, front right, 06-08-2025.jpg" },
      { gen: "mk3", from: 2019, to: 2026, file: "2020 Ford Kuga Titanium Plug-In Hybrid Front.jpg" }
    ],
    "ford|ecosport": [
      { gen: "mk1", from: 2003, to: 2012, file: "Ford EcoSport 1.6 XLS 2010 (14429429851).jpg" },
      { gen: "mk2", from: 2012, to: 2023, file: "2014 Ford EcoSport 2.0 in Mars Red, Front Left, 05-17-2022.jpg" }
    ],
    "ford|edge": [
      { gen: "i", from: 2015, to: 2018, file: "2016 Ford Edge SEL in Magnetic Metallic, Front Right, 07-30-2023.jpg" },
      { gen: "i-fl", from: 2018, to: 2023, file: "2019 Ford Edge ST-Line facelift 2.0 Front.jpg" }
    ],
    "ford|mustang": [
      { gen: "s550", from: 2015, to: 2023, file: "Ford MUSTANG GT (S550) front.jpg" },
      { gen: "s650", from: 2023, to: 2026, file: "2024 Ford Mustang GT Premium convertible, front left, 09-28-2024.jpg" }
    ],
    "ford|ranger": [
      { gen: "i", from: 1998, to: 2006, file: "2004 Ford Ranger Super Cab 2.5L D.jpg" },
      { gen: "ii", from: 2006, to: 2011, file: "2007 Ford Ranger Thunder TDCI Automatic 3.0 Front.jpg" },
      { gen: "iii", from: 2011, to: 2022, file: "2012 Ford Ranger Wildtrak 4x4 Doppelkabine in Wildtrak-Orange Metallic, Front Right, 06-08-2023.jpg" },
      { gen: "iv", from: 2022, to: 2026, file: "Ford Ranger (T6, P703) Wildtrak IMG 7320.jpg" }
    ],
    "ford|transit": [
      { gen: "mk5", from: 1994, to: 2000, file: "1996 Ford Transit 190 LWB 2.5 Front.jpg" },
      { gen: "mk6", from: 2000, to: 2006, file: "2001 Ford Transit 260 SWB TD 2.0 Front.jpg" },
      { gen: "mk7", from: 2006, to: 2014, file: "Ford Transit front 20071124.jpg" },
      { gen: "mk8", from: 2014, to: 2023, file: "2015 Ford Transit 350 Trend 2.2 Front.jpg" },
      { gen: "mk9", from: 2023, to: 2026, file: "2023 Ford Transit Trail 350 EcoBlue AWD.jpg" }
    ],
    "ford|tourneo": [
      { gen: "courier-i", from: 2014, to: 2023, file: "Ford Tourneo Courier (MSP15).JPG" },
      { gen: "courier-ii", from: 2023, to: 2026, file: "Ford Tourneo Courier (2nd generation) Auto Zuerich 2023 1X7A1169.jpg" },
      { gen: "connect-i", from: 2002, to: 2013, file: "Ford Tourneo Connect - Mondial de l'Automobile de Paris 2012 - 001.jpg" },
      { gen: "connect-ii", from: 2013, to: 2021, file: "2015 Ford Grand Tourneo Connect Zetec 1.5 Front.jpg" },
      { gen: "connect-iii", from: 2022, to: 2026, file: "Ford Tourneo Connect Active (3rd generation) IMG 8620.jpg" },
      { gen: "custom-i", from: 2012, to: 2022, file: "Ford Tourneo Custom (MSP15).JPG" },
      { gen: "custom-ii", from: 2022, to: 2026, file: "Ford Tourneo Custom (2023) Autofrühling Ulm IMG 9360.jpg" }
    ],
    "ford|galaxy": [
      { gen: "mk1", from: 1995, to: 2006, file: "Ford Galaxy (1995-2000) Front.jpg" },
      { gen: "mk2", from: 2006, to: 2015, file: "Ford Galaxy 2008 front.jpg" },
      { gen: "mk3", from: 2015, to: 2023, file: "2016 Ford Galaxy Titanium TDCi 2.0 Front.jpg" }
    ],
    "ford|s-max": [
      { gen: "mk1", from: 2006, to: 2015, file: "Ford S-Max front 20071119.jpg" },
      { gen: "mk2", from: 2015, to: 2023, file: "2017 Ford S-Max Vignale TDCi Automatic 2.0.jpg" }
    ],
    "ford|explorer": [
      { gen: "v", from: 2011, to: 2019, file: "Front of 2011 Ford Explorer (6615651269).jpg" },
      { gen: "vi", from: 2019, to: 2024, file: "2020 Ford Explorer XLT in Oxford White, front left.jpg" },
      { gen: "vi-fl", from: 2024, to: 2026, file: "2025 Ford Explorer Active (facelift), front 12.20.24.jpg" }
    ],
    "ford|f-150": [
      { gen: "xii", from: 2009, to: 2014, file: "2010 Ford F-150 SVT Raptor SuperCab, front left, 04-04-2023.jpg" },
      { gen: "xiii", from: 2015, to: 2020, file: "2016 Ford F-150 XL SuperCab 4x2 with XL Sport Package, front right, 07-09-2023.jpg" },
      { gen: "xiv", from: 2021, to: 2026, file: "2021 Ford F-150 (fourteenth generation) front view 01.png" }
    ],
    "honda|jazz": [
      { gen: "gd", from: 2002, to: 2008, file: "2002-2004 Honda Jazz (GD) hatchback 02.jpg" },
      { gen: "ge", from: 2008, to: 2015, file: "2008-2010 Honda Jazz (GE) hatchback 01.jpg" },
      { gen: "gk", from: 2015, to: 2020, file: "2017 Honda Jazz SE 1.3 Front.jpg" },
      { gen: "gr", from: 2020, to: 2026, file: "2021 Honda Jazz SE i-MMD CVT 1.5 Front.jpg" }
    ],
    "honda|civic": [
      { gen: "ep", from: 2001, to: 2005, file: "2003 Honda Civic (EU3 MY03) Vi 5-door hatchback (2010-07-22).jpg" },
      { gen: "fk", from: 2006, to: 2011, file: "2008 Honda Civic hatchback in Galaxy Grey, front left, 06-05-2025.jpg" },
      { gen: "fb", from: 2012, to: 2016, file: "2012 Honda Civic (FK2 MY12) VTi-S hatchback (2012-10-26) 01 (cropped).jpg" },
      { gen: "fc", from: 2017, to: 2021, file: "Honda Civic Type R (2017) 1X7A0088.jpg" },
      { gen: "fl", from: 2022, to: 2026, file: "Honda Civic XI hatchback 002.jpg" }
    ],
    "honda|accord": [
      { gen: "cg", from: 1998, to: 2002, file: "1998-2000 Honda Accord Sedan 2.jpg" },
      { gen: "cl", from: 2003, to: 2008, file: "2003-2005 Honda Accord Euro Luxury sedan (2010-09-19) 01.jpg" },
      { gen: "cu", from: 2008, to: 2015, file: "Honda Accord Tourer 2.2 i-DTEC (2010) (54717100904).jpg" }
    ],
    "honda|cr-v": [
      { gen: "rd", from: 1997, to: 2001, file: "1999-2001 Honda CR-V wagon 01.jpg" },
      { gen: "re", from: 2002, to: 2006, file: "2005 Honda CR-V (RD7 MY05) Sport wagon (2009-06-06).jpg" },
      { gen: "re3", from: 2007, to: 2011, file: "2007-2009 Honda CR-V (RE MY2007) Sport wagon 01.jpg" },
      { gen: "rm", from: 2012, to: 2018, file: "2012-2014 Honda CR-V Feel Fabulous.jpg" },
      { gen: "rw", from: 2018, to: 2022, file: "2019 Honda CR-V EX i-VTEC 1.5.jpg" },
      { gen: "rs", from: 2023, to: 2026, file: "Honda CR-V (6th generation) hybrid 1X7A1956.jpg" }
    ],
    "honda|hr-v": [
      { gen: "gh", from: 1999, to: 2006, file: "2000 Honda HR-V 1.6 Front.jpg" },
      { gen: "ru", from: 2015, to: 2021, file: "2017 Honda HR-V SE Navi 1.6.jpg" },
      { gen: "rv", from: 2021, to: 2026, file: "Honda HR-V eHEV Advance (III) – f 31122023.jpg" }
    ],
    "honda|e-ny1": [
      { gen: "e1", from: 2023, to: 2026, file: "Honda e-Ny1 IAA 2023 1X7A0562.jpg" }
    ],
    "honda|zr-v": [
      { gen: "rz", from: 2023, to: 2026, file: "Honda ZR-V e-HEV IAA 2023 1X7A0542.jpg" }
    ],
    "jeep|avenger": [
      { gen: "jx", from: 2023, to: 2026, file: "2023 Jeep Avenger front view.png" }
    ],
    "jeep|cherokee": [
      { gen: "kj", from: 2002, to: 2007, file: "2004 Jeep Cherokee CRD Sport 2.5 Front.jpg" },
      { gen: "kk", from: 2008, to: 2013, file: "Jeep Cherokee Limited 2.8 CRD Jeepgreen.JPG" },
      { gen: "kl", from: 2014, to: 2020, file: "2016 Jeep Cherokee Sport, front left, 05-24-2024.jpg" }
    ],
    "jeep|compass": [
      { gen: "mp", from: 2017, to: 2026, file: "2018 Jeep Compass Latitude 2.4L front 4.20.19.jpg" }
    ],
    "jeep|grand-cherokee": [
      { gen: "wk", from: 2005, to: 2011, file: "Jeep Grand Cherokee front 20070518.jpg" },
      { gen: "wk2", from: 2011, to: 2021, file: "2016 Jeep Grand Cherokee Laredo, Front Left, 09-15-2020.jpg" },
      { gen: "wl", from: 2021, to: 2026, file: "2022 Jeep Grand Cherokee Summit Reserve 4x4 in Bright White, Front Left, 01-16-2022.jpg" }
    ],
    "jeep|renegade": [
      { gen: "bu", from: 2014, to: 2026, file: "2016 Jeep Renegade Limited Multijet 4X4 2.0 Front.jpg" }
    ],
    "jeep|wrangler": [
      { gen: "tj", from: 1996, to: 2006, file: "1997 Jeep Wrangler TJ SE, Front Left, 09-20-2020.jpg" },
      { gen: "jk", from: 2007, to: 2018, file: "2012 Jeep Wrangler Unlimited (JK) Front.jpg" },
      { gen: "jl", from: 2018, to: 2026, file: "2018 Jeep Wrangler Sport S 2-door, front left, 09-30-2023.jpg" }
    ],
    "mini|aceman": [
      { gen: "j05", from: 2024, to: 2026, file: "BMW MINI ACEMAN E (J05) front.jpg" }
    ],
    "mini|cabrio": [
      { gen: "r52", from: 2004, to: 2008, file: "Mini Cooper Cabrio.JPG" },
      { gen: "r57", from: 2009, to: 2015, file: "BMW MINI COOPER CONVERTIBLE (R57) front.JPG" },
      { gen: "f57", from: 2016, to: 2024, file: "2016 MINI Convertible Cooper in Caribbean Aqua Metallic, front left (Queen Street 2023).jpg" }
    ],
    "mini|clubman": [
      { gen: "r55", from: 2007, to: 2014, file: "BMW MINI COOPER S CLUBMAN (R55) front.JPG" },
      { gen: "f54", from: 2015, to: 2024, file: "BMW MINI CLUBMAN COOPER (F54) front.jpg" }
    ],
    "mini|cooper": [
      { gen: "r50", from: 2001, to: 2006, file: "BMW MINI COOPER (R50) front.JPG" },
      { gen: "r56", from: 2006, to: 2013, file: "BMW MINI COOPER S (R56) front.JPG" },
      { gen: "f56", from: 2014, to: 2024, file: "BMW MINI 3door COOPER (F56) front.jpg" },
      { gen: "j01", from: 2024, to: 2026, file: "BMW MINI COOPER SE (J01) front.jpg" }
    ],
    "mini|countryman": [
      { gen: "r60", from: 2010, to: 2017, file: "BMW MINI COUNTRYMAN S (R60) front.JPG" },
      { gen: "f60", from: 2017, to: 2024, file: "2022 MINI Countryman Cooper ALL4, front right, 10-28-2023.jpg" },
      { gen: "u25", from: 2024, to: 2026, file: "BMW MINI COUNTRYMAN C (U25) front.jpg" }
    ],
    "mazda|mazda2": [
      { gen: "dy", from: 2003, to: 2007, file: "Mazda 2 1.4 MZI (2003) (53053360246).jpg" },
      { gen: "de", from: 2007, to: 2014, file: "Mazda2 front 20080921.jpg" },
      { gen: "dj", from: 2014, to: 2026, file: "Mazda2 1.5 SKYACTIV-G 115 i-ELOOP Sports-Line Cyanitblau-Metallic Vorderansicht LED-Scheinwerfer.jpg" }
    ],
    "mazda|mazda3": [
      { gen: "bk", from: 2004, to: 2009, file: "Mazda3s-2005-Grill.jpg" },
      { gen: "bl", from: 2009, to: 2013, file: "2010 Mazda3 hatchback front--DC.jpg" },
      { gen: "bm", from: 2014, to: 2019, file: "2015 Mazda3 i Sport 5-door, front left, 10-29-2023.jpg" },
      { gen: "bp", from: 2019, to: 2026, file: "2020 Mazda3 Premium Package in Deep Crystal Blue Mica, front left.jpg" }
    ],
    "mazda|mazda6": [
      { gen: "gg", from: 2002, to: 2007, file: "2004 Mazda6 TS Automatic 2.0 Front.jpg" },
      { gen: "gh", from: 2008, to: 2012, file: "2009 Mazda6 SL Diesel Estate 2.2 Front.jpg" },
      { gen: "gj", from: 2013, to: 2023, file: "2014 Mazda6 SE-L Diesel Estate 2.2 Front.jpg" }
    ],
    "mazda|cx-3": [
      { gen: "dk", from: 2015, to: 2022, file: "Mazda CX-3 XD Touring L Package 4WD (LDA-DK5AW) front.JPG" }
    ],
    "mazda|cx-30": [
      { gen: "dm", from: 2019, to: 2026, file: "2019 Mazda CX-30 Front.jpg" }
    ],
    "mazda|cx-5": [
      { gen: "ke", from: 2012, to: 2017, file: "2013 Mazda CX-5 (KE MY13) GT AWD wagon (2014-04-20).jpg" },
      { gen: "kf", from: 2017, to: 2026, file: "Mazda CX-5 (2018) (52720615716).jpg" }
    ],
    "mazda|cx-60": [
      { gen: "kh", from: 2022, to: 2026, file: "Mazda CX-60 XD-HYBRID Premium Modern (3CA-KH3R3P) front.jpg" }
    ],
    "mazda|mx-5": [
      { gen: "nb", from: 1998, to: 2005, file: "2001 Mazda MX-5 S (NB) - 1.8 (140PS) petrol manual - 2025-05-05, front right.jpg" },
      { gen: "nc", from: 2005, to: 2015, file: "Mazda MX-5 front 20071022.jpg" },
      { gen: "nd", from: 2015, to: 2026, file: "2016 Mazda MX-5 Sport NAV 1.5 Front.jpg" }
    ],
    "suzuki|swift": [
      { gen: "rs", from: 2005, to: 2010, file: "Tuned Suzuki SWIFT (ZC11S) front.JPG" },
      { gen: "azg", from: 2010, to: 2017, file: "2012 Suzuki Swift SZ4 1.2 Front.jpg" },
      { gen: "a2l", from: 2017, to: 2023, file: "2018 Suzuki Swift SZ5 Boosterjet SHVS 1.0 Front.jpg" },
      { gen: "aol", from: 2024, to: 2026, file: "Suzuki Swift (2024) hybrid DSC 7922.jpg" }
    ],
    "suzuki|ignis": [
      { gen: "fh", from: 2000, to: 2008, file: "2003 Suzuki Ignis (RG413) GL 5-door hatchback (2009-11-16).jpg" },
      { gen: "mf", from: 2016, to: 2026, file: "2017 Suzuki Ignis Intro Edition, Sprengelkiez (front left side).jpg" }
    ],
    "suzuki|vitara": [
      { gen: "ta", from: 1988, to: 1997, file: "1988-1990 Suzuki Vitara (SE416V Type1) JLX hardtop (2015-06-03) 01.jpg" },
      { gen: "gt", from: 1997, to: 2005, file: "2003 Suzuki Grand Vitara 4WD, front left, 03-24-2023.jpg" },
      { gen: "jt", from: 2005, to: 2015, file: "Suzuki Grand Vitara front 20070520.jpg" },
      { gen: "ly", from: 2015, to: 2026, file: "2021 Suzuki LY Vitara 1.4 front side.jpg" }
    ],
    "suzuki|s-cross": [
      { gen: "jy", from: 2013, to: 2021, file: "2014 Suzuki SX4 S-Cross, front left side.jpg" },
      { gen: "jyb", from: 2021, to: 2026, file: "2022 Suzuki S-Cross 1.5 Auto in BIP Mall 01.jpg" }
    ],
    "suzuki|jimny": [
      { gen: "jb", from: 1998, to: 2018, file: "2005 Suzuki Jimny XC in Silky Silver Metallic, front right.jpg" },
      { gen: "jb4", from: 2018, to: 2026, file: "2019 Suzuki Jimny SZ5 4X4 Automatic 1.5 Front.jpg" }
    ],
    "suzuki|across": [
      { gen: "xa50", from: 2020, to: 2026, file: "Suzuki Across (XA50) 1X7A6320.jpg" }
    ],
    "suzuki|swace": [
      { gen: "e210", from: 2020, to: 2025, file: "2021 Suzuki Swace 1.8 Hybrid (51680079489).jpg" }
    ],
    "mitsubishi|space-star": [
      { gen: "dg", from: 1998, to: 2005, file: "Mitsubishi Space Star silver.jpg" },
      { gen: "a0", from: 2012, to: 2026, file: "2014 Mitsubishi Mirage ES in green, front left.jpg" }
    ],
    "mitsubishi|asx": [
      { gen: "ga0", from: 2010, to: 2022, file: "Mitsubishi ASX (MSP15).JPG" },
      { gen: "ga2", from: 2023, to: 2026, file: "Mitsubishi ASX (2nd generation) 1X7A7067.jpg" }
    ],
    "mitsubishi|eclipse-cross": [
      { gen: "gk", from: 2017, to: 2026, file: "2018 Mitsubishi Eclipse Cross 4X4 CVT 1.5 Front.jpg" }
    ],
    "mitsubishi|outlander": [
      { gen: "cu", from: 2003, to: 2006, file: "Mitsubishi Outlander I (2003-2006) front.jpg" },
      { gen: "cw", from: 2006, to: 2012, file: "Mitsubishi Outlander Facelift front.jpg" },
      { gen: "gf", from: 2012, to: 2021, file: "2014 Mitsubishi Outlander SE, front left, 09-28-2024.jpg" },
      { gen: "gn", from: 2021, to: 2026, file: "2022 Mitsubishi Outlander ES 2WD 7seater front.jpg" }
    ],
    "mitsubishi|l200": [
      { gen: "k74", from: 1996, to: 2006, file: "2003 Mitsubishi L200.jpg" },
      { gen: "kb", from: 2006, to: 2015, file: "Mitsubishi L200 2.5 DI-D+ Doppelkabine (2011 - 2016) (52056568222).jpg" },
      { gen: "kj", from: 2015, to: 2019, file: "2016 Mitsubishi L200 Barbarian in Cosmos Black, front left, 06-08-2025.jpg" },
      { gen: "kl", from: 2019, to: 2026, file: "Mitsubishi L200 2.2 DI-D+ Doppelkabine (2021) (52075912614).jpg" }
    ],
    "mitsubishi|colt": [
      { gen: "cj", from: 1996, to: 2003, file: "Mitsubishi Colt 1.6 GLXi 1999 (37432762334).jpg" },
      { gen: "z30", from: 2002, to: 2012, file: "2005 Mitsubishi Colt Equippe 1.3 Front.jpg" },
      { gen: "cl7", from: 2023, to: 2026, file: "Mitsubishi Colt (2023) 1X7A1808 (cropped).jpg" }
    ],
    "fiat|500": [
      { gen: "312", from: 2007, to: 2024, file: "Fiat 500 (2007) front.jpg" },
      { gen: "332", from: 2020, to: 2026, file: "FIAT 500e ICON (ZAA-FA1) front.jpg" }
    ],
    "fiat|500x": [
      { gen: "334", from: 2014, to: 2018, file: "2017 FIAT 500X Trekking AWD, front left, 02-17-2023.jpg" },
      { gen: "334fl", from: 2018, to: 2026, file: "2021 FIAT 500X Hey Google - 999cc 1.0 (120PS) Petrol - Silver - 02-2025, Front.jpg" }
    ],
    "fiat|panda": [
      { gen: "169", from: 2003, to: 2012, file: "Fiat Panda front 20080326.jpg" },
      { gen: "319", from: 2011, to: 2026, file: "Fiat Panda (2011) front.jpg" }
    ],
    "fiat|tipo": [
      { gen: "160", from: 1995, to: 2001, file: "Fiat Tipo S 1.6 iE 1996 (26945127507).jpg" },
      { gen: "356", from: 2015, to: 2023, file: "2016 Fiat Tipo Easy+ T-Jet 1.4 Front.jpg" }
    ],
    "fiat|124-spider": [
      { gen: "348", from: 2016, to: 2019, file: "2017 Fiat 124 Spider, Front Left, 10-01-2021.jpg" }
    ],
    "fiat|ducato": [
      { gen: "230", from: 1994, to: 2002, file: "1999 Fiat Ducato 10 Diesel SWB 1.9 Front.jpg" },
      { gen: "244", from: 2002, to: 2006, file: "Fiat Ducato SeriesII Type 244 2004-2006 frontright TNT 20080320 U.JPG" },
      { gen: "250", from: 2006, to: 2014, file: "Fiat Ducato 100 Multijet in Kielce.jpg" },
      { gen: "290", from: 2014, to: 2026, file: "2017 Fiat Ducato 35 Multijet 2.3 Front.jpg" }
    ],
    "fiat|doblo": [
      { gen: "223", from: 2000, to: 2010, file: "2006 FIAT Doblò Cargo SWB 1.3 JTD (Front).jpg" },
      { gen: "263", from: 2010, to: 2022, file: "Fiat Doblò II front 20100402.jpg" },
      { gen: "k9", from: 2022, to: 2026, file: "Fiat Doblò 1.5 BlueHDi (2023) (53513723849).jpg" }
    ],
    "fiat|scudo": [
      { gen: "220", from: 1996, to: 2007, file: "1998 Fiat Scudo EL Diesel 1.9 Front.jpg" },
      { gen: "270", from: 2007, to: 2016, file: "2009 Fiat Scudo Comfort 120 Multijet SWB 2.0 Front.jpg" },
      { gen: "k0", from: 2022, to: 2026, file: "Fiat Scudo (2022) 1X7A0336.jpg" }
    ],
    "kia|picanto": [
      { gen: "sa", from: 2004, to: 2011, file: "2004 Kia Picanto LX 1.1 Front.jpg" },
      { gen: "ta", from: 2011, to: 2017, file: "2011 Kia Picanto SE, East Surabaya.jpg" },
      { gen: "ja", from: 2017, to: 2026, file: "2017 Kia Picanto GT-Line S 1.2 Front.jpg" }
    ],
    "kia|rio": [
      { gen: "jb", from: 2005, to: 2011, file: "2006 Kia Rio (JB) hatchback (2012-10-26).jpg" },
      { gen: "ub", from: 2011, to: 2017, file: "2012 Kia Rio SX hatchback -- 12-22-2011.jpg" },
      { gen: "yb", from: 2017, to: 2023, file: "Kia Rio 2017 (Russia).jpg" }
    ],
    "kia|ceed": [
      { gen: "ed", from: 2006, to: 2012, file: "2007 Kia cee'd LS CRDi 1.6.jpg" },
      { gen: "jd", from: 2012, to: 2018, file: "2012 KIA Ceed 4 EcoDynamics CRDi - 1582cc 1.6 (127PS) Diesel - Silver - 05-2024, Front.jpg" },
      { gen: "cd", from: 2018, to: 2026, file: "Kia Ceed, GIMS 2018, Le Grand-Saconnex (1X7A1901).jpg" }
    ],
    "kia|xceed": [
      { gen: "cd", from: 2019, to: 2026, file: "Kia XCeed at IAA 2019 IMG 0742.jpg" }
    ],
    "kia|sportage": [
      { gen: "i", from: 1995, to: 2004, file: "1996-1999 Kia Sportage (NB-7) wagon (14203216710).jpg" },
      { gen: "ii", from: 2004, to: 2010, file: "2005-08 Kia Sportage LX.JPG" },
      { gen: "iii", from: 2010, to: 2015, file: "2010 Kia Sportage (SL) Si wagon (2011-08-17) 01.jpg" },
      { gen: "iv", from: 2015, to: 2021, file: "2016 Kia Sportage (QL MY17) Platinum wagon (2017-07-15) 01.jpg" },
      { gen: "v", from: 2021, to: 2026, file: "Kia Sportage (NQ5; 2021).jpg" }
    ],
    "kia|sorento": [
      { gen: "i", from: 2002, to: 2009, file: "2003-06 Kia Sorento LX.JPG" },
      { gen: "ii", from: 2009, to: 2014, file: "2011 Kia Sorento EX 1 -- 11-25-2009.jpg" },
      { gen: "iii", from: 2014, to: 2020, file: "2015 Kia Sorento (UM MY15) Platinum CRDi wagon (2015-11-13) 01.jpg" },
      { gen: "iv", from: 2020, to: 2026, file: "2020 Kia Sorento 4 HEV AWD Automatic 1.6 Front.jpg" }
    ],
    "kia|stonic": [
      { gen: "stonic", from: 2017, to: 2026, file: "Kia Stonic IMG 4133.jpg" }
    ],
    "kia|niro": [
      { gen: "de", from: 2016, to: 2022, file: "2017 Kia Niro 3 S-A 1.6.jpg" },
      { gen: "sg2", from: 2022, to: 2026, file: "Kia Niro (SG2) PHEV 1X7A6012.jpg" }
    ],
    "kia|ev6": [
      { gen: "cv", from: 2021, to: 2026, file: "Kia EV6 IMG 7911.jpg" }
    ],
    "kia|ev9": [
      { gen: "mv", from: 2023, to: 2026, file: "Kia EV9 1X7A2472.jpg" }
    ],
    "kia|soul": [
      { gen: "am", from: 2008, to: 2013, file: "Kia Soul AM France 2009-05-22.jpg" },
      { gen: "ps", from: 2013, to: 2019, file: "2014 Kia Soul in Titanium Gray, front left, 02-14-2026.jpg" },
      { gen: "sk3", from: 2019, to: 2026, file: "2019 Kia Soul EV Front.jpg" }
    ],
    "kia|carens": [
      { gen: "un", from: 2013, to: 2019, file: "Kia Carens 2013.jpg" }
    ],
    "hyundai|i10": [
      { gen: "pa", from: 2008, to: 2013, file: "Hyundai i10 front-3.jpg" },
      { gen: "ia", from: 2013, to: 2019, file: "2014 Hyundai i10 Rear Front.jpg" },
      { gen: "ac3", from: 2019, to: 2026, file: "Hyundai i10 (AC3; 2019).jpg" }
    ],
    "hyundai|i20": [
      { gen: "pb", from: 2008, to: 2014, file: "Hyundai i20 5D front - PSM 2009.jpg" },
      { gen: "gb", from: 2014, to: 2020, file: "2015 Hyundai i20 Premium SE MPi 1.4 Front.jpg" },
      { gen: "bc3", from: 2020, to: 2026, file: "Hyundai i20 1.0 T-GDI (2021) (52199171813).jpg" }
    ],
    "hyundai|i30": [
      { gen: "fd", from: 2007, to: 2012, file: "Hyundai I30 Ongar 2008.JPG" },
      { gen: "gd", from: 2012, to: 2017, file: "2013040611 Hyundai i30.png" },
      { gen: "pd", from: 2017, to: 2026, file: "2018 Hyundai i30 SE Nav T-GDi 1.3 Front.jpg" }
    ],
    "hyundai|tucson": [
      { gen: "jm", from: 2004, to: 2010, file: "2005 Hyundai Tucson GLS, front left, 03-08-2024.jpg" },
      { gen: "lm", from: 2010, to: 2015, file: "Hyundai ix35 LM China 2012-07-29.jpg" },
      { gen: "tl", from: 2015, to: 2020, file: "2016 Hyundai Tucson 2.0L Premium AWD in Caribbean Blue, front left, 2024-08-16.jpg" },
      { gen: "nx4", from: 2020, to: 2026, file: "2021 Hyundai Tucson Ultimate T-GDi MHEV 1.6 Front.jpg" }
    ],
    "hyundai|santa-fe": [
      { gen: "sm", from: 2000, to: 2006, file: "2003 Hyundai Santa Fe CRTD - 1991cc 2.0 (115PS) Diesel - Black - 12-2023, Front.jpg" },
      { gen: "cm", from: 2006, to: 2012, file: "Hyundai Santa Fe front 20070523.jpg" },
      { gen: "dm", from: 2012, to: 2018, file: "2013 Hyundai Santa Fe 2.0T Limited in Titanium Silver, front left, 2024-09-29.jpg" },
      { gen: "tm", from: 2018, to: 2023, file: "2019 Hyundai Santa Fe HTRAC Front.jpg" },
      { gen: "mx5", from: 2024, to: 2026, file: "2024 Hyundai Santa Fe (MX5) IMG 5295.jpg" }
    ],
    "hyundai|kona": [
      { gen: "os", from: 2017, to: 2023, file: "2018 Hyundai Kona Preferred in Tangerine Comet, Front Left, 06-12-2022.jpg" },
      { gen: "sx2", from: 2023, to: 2026, file: "2024 Hyundai Kona Elite Hybrid front.jpg" }
    ],
    "hyundai|bayon": [
      { gen: "bc3", from: 2021, to: 2026, file: "Hyundai Bayon 1X7A0844.jpg" }
    ],
    "hyundai|ioniq": [
      { gen: "ae", from: 2016, to: 2022, file: "2017 Hyundai Ioniq Premium HEV S-A 1.6 Front.jpg" }
    ],
    "hyundai|ioniq-5": [
      { gen: "ne", from: 2021, to: 2026, file: "Hyundai Ioniq 5 (front).jpg" }
    ],
    "hyundai|ioniq-6": [
      { gen: "ce", from: 2022, to: 2026, file: "2023 Hyundai Ioniq 6 Limited, front 4.27.23.jpg" }
    ],
    "hyundai|ix35": [
      { gen: "lm", from: 2010, to: 2015, file: "Hyundai ix35 1.7 CRDi 4WD (2012) (53513766141).jpg" }
    ],
    "land-rover|range-rover-evoque": [
      { gen: "i", from: 2011, to: 2018, file: "2017 Range Rover Evoque 2.0 SD AT HSE Dynamic 5dr red front.jpg" },
      { gen: "ii", from: 2018, to: 2026, file: "Land Rover Range Rover Evoque R Dynamic (II) – h 13072025.jpg" }
    ],
    "mazda|cx-5": [
      { gen: "ke", from: 2012, to: 2017, file: "2014 Mazda CX-5 Grand Touring 2.5 KE (20210828) 01.jpg" },
      { gen: "kf", from: 2017, to: 2026, file: "Mazda CX-5 (Front), Jakarta, Indonesia.jpg" }
    ],
    "mercedes-benz|clase-a": [
      { gen: "w168", from: 1997, to: 2004, file: "Mercedes W168 front 20070926.jpg" },
      { gen: "w169", from: 2004, to: 2012, file: "Mercedes W169 front 20080320.jpg" },
      { gen: "w176", from: 2012, to: 2018, file: "Mercedes-AMG A 45 (W176) front.jpg" },
      { gen: "w177", from: 2018, to: 2026, file: "Mercedes-Benz A 200 (W177, 2020) (54733793681).jpg" }
    ],
    "mercedes-benz|clase-b": [
      { gen: "w245", from: 2005, to: 2011, file: "Mercedes-Benz B180 facelift (W245) in Indonesia 01.jpg" },
      { gen: "w246", from: 2011, to: 2018, file: "Mercedes-Benz B250 (W246) front.JPG" },
      { gen: "w247", from: 2018, to: 2026, file: "Mercedes-Benz B 180 (W247) front.jpg" }
    ],
    "mercedes-benz|clase-c": [
      { gen: "w203", from: 2000, to: 2007, file: "Mercedes-Benz C240 W203 (7664313588).jpg" },
      { gen: "w204", from: 2007, to: 2014, file: "Mercedes-Benz W204 in Kerpe.jpg" },
      { gen: "w205", from: 2014, to: 2021, file: "Moscow, Mercedes C250 blue, Feb 2026 01.jpg" },
      { gen: "w206", from: 2021, to: 2026, file: "Mercedes-Benz C 260L front (October 29, 2024).jpg" }
    ],
    "mercedes-benz|clase-e": [
      { gen: "w210", from: 1995, to: 2002, file: "Mercedes W210 front 20070926.jpg" },
      { gen: "w211", from: 2002, to: 2009, file: "Mercedes Benz W211 front 20070326.jpg" },
      { gen: "w212", from: 2009, to: 2016, file: "Mercedes-Benz W212 E 220 CDI 7-G-Tronic Obsidianschwarz Front.JPG" },
      { gen: "w213", from: 2016, to: 2023, file: "Mercedes-Benz E 200 Sports (W213) front.jpg" },
      { gen: "w214", from: 2023, to: 2026, file: "Mercedes-Benz E 200 Edition Exclusive (W214) front.jpg" }
    ],
    "mercedes-benz|clase-s": [
      { gen: "w220", from: 1998, to: 2005, file: "Mercedes W220 front 20070928.jpg" },
      { gen: "w221", from: 2005, to: 2013, file: "Mercedes S 320 CDI (W221) front.jpg" },
      { gen: "w222", from: 2013, to: 2020, file: "Mercedes-Benz S 500 (W222) front view.jpg" },
      { gen: "w223", from: 2020, to: 2026, file: "W223 Front.jpg" }
    ],
    "mercedes-benz|clase-v": [
      { gen: "w447", from: 2014, to: 2026, file: "Mercedes-Benz V220d AVANTGARDE Extra-long (W447) front.JPG" }
    ],
    "mercedes-benz|cla": [
      { gen: "c117", from: 2013, to: 2019, file: "Mercedes-Benz CLA180 (C117) front.jpg" },
      { gen: "c118", from: 2019, to: 2026, file: "Mercedes-Benz CLA250 4MATIC Coupé (C118) front.jpg" }
    ],
    "mercedes-benz|cls": [
      { gen: "c219", from: 2004, to: 2010, file: "Mercedes-Benz CLS350 (C219) front.JPG" },
      { gen: "c218", from: 2010, to: 2018, file: "Mercedes-Benz CLS-Class (C218) front Poznan 2011.jpg" },
      { gen: "c257", from: 2018, to: 2026, file: "Mercedes-Benz CLS450 4MATIC Sports Coupé (C257) front.jpg" }
    ],
    "mercedes-benz|eqa": [
      { gen: "h243", from: 2021, to: 2026, file: "Mercedes-Benz EQA 250 (H243) front.jpg" }
    ],
    "mercedes-benz|eqb": [
      { gen: "x243", from: 2021, to: 2026, file: "Mercedes-Benz EQB (X243, European specifications) front.jpg" }
    ],
    "mercedes-benz|eqc": [
      { gen: "n293", from: 2019, to: 2024, file: "Mercedes-Benz EQC 400 4MATIC (N293) front.jpg" }
    ],
    "mercedes-benz|eqe": [
      { gen: "v295", from: 2021, to: 2026, file: "Mercedes-Benz EQE 350+ (ZAA-295121) front.jpg" }
    ],
    "mercedes-benz|eqs": [
      { gen: "v297", from: 2021, to: 2026, file: "2023 Mercedes-Benz EQS 580 grey front three quarter.jpg" }
    ],
    "mercedes-benz|gla": [
      { gen: "x156", from: 2013, to: 2019, file: "Mercedes-Benz GLA250 4MATIC Sports (X156) front.jpg" },
      { gen: "h247", from: 2019, to: 2026, file: "Mercedes-Benz GLA 200d 4MATIC (H247) front.jpg" }
    ],
    "mercedes-benz|glb": [
      { gen: "x247", from: 2019, to: 2026, file: "Mercedes-Benz GLB 200d (X247) front.jpg" }
    ],
    "mercedes-benz|glc": [
      { gen: "x253", from: 2015, to: 2022, file: "2018 Mercedes-Benz GLC 250 Urban Edition 4MATIC 2.0 Front.jpg" },
      { gen: "x254", from: 2022, to: 2026, file: "2024 Mercedes-Benz GLC 300 4MATIC (hire car) front.jpg" }
    ],
    "mercedes-benz|gle": [
      { gen: "w166", from: 2011, to: 2018, file: "2016 Mercedes-Benz GLE 350 d (W 166) wagon (2016-03-05) 01.jpg" },
      { gen: "v167", from: 2018, to: 2026, file: "Mercedes-Benz GLE-Klasse (V167) GLE 300 d 4MATIC (2021) (53325763767).jpg" }
    ],
    "mercedes-benz|gls": [
      { gen: "x166", from: 2012, to: 2019, file: "Mercedes-Benz GLS 350d 4MATIC Sports (X166) front.JPG" },
      { gen: "x167", from: 2019, to: 2026, file: "Mercedes-Benz GLS 450d 4MATIC (X167) front.jpg" }
    ],
    "mercedes-benz|sprinter": [
      { gen: "w906", from: 2006, to: 2018, file: "Mercedes Sprinter II (W906) Kleinbus (seit 2006) front MJ.JPG" },
      { gen: "w907", from: 2018, to: 2026, file: "Mercedes Benz Sprinter 2500 2019 Front View 01.jpg" }
    ],
    "mercedes-benz|vito": [
      { gen: "w639", from: 2003, to: 2014, file: "Mercedes W639 front 20080127.jpg" },
      { gen: "w447", from: 2014, to: 2026, file: "Mercedes-Benz Vito Tourer W447 Vorderansicht.jpg" }
    ],
    "mg|mg4": [
      { gen: "mg4", from: 2022, to: 2026, file: "MG4 EV Front view at Universitas Widyatama.jpg" }
    ],
    "nissan|micra": [
      { gen: "k11", from: 1992, to: 2003, file: "1995 Nissan Micra L 1.0 Front.jpg" },
      { gen: "k12", from: 2003, to: 2010, file: "Nissan Micra III (Facelift, seit 2005) front MJ.JPG" },
      { gen: "k13", from: 2010, to: 2017, file: "2012 Nissan Micra Shiro 1.2 (Front).jpg" },
      { gen: "k14", from: 2017, to: 2023, file: "2017 Nissan Micra N-Connecta IG-T 900cc Front.jpg" }
    ],
    "nissan|note": [
      { gen: "e11", from: 2006, to: 2013, file: "Nissan Note 001.JPG" },
      { gen: "e12", from: 2013, to: 2021, file: "2014 Nissan Note Tekna 1.2 DIG-S in Force Red, front right, 2024-05-10.jpg" }
    ],
    "nissan|juke": [
      { gen: "f15", from: 2010, to: 2019, file: "Nissan Juke front Poznan 2011.jpg" },
      { gen: "f16", from: 2019, to: 2026, file: "2020 Nissan Juke N-Connecta DiG-T S-A 1.0 Front.jpg" }
    ],
    "nissan|qashqai": [
      { gen: "j10", from: 2007, to: 2013, file: "Nissan Qashqai dCi front.JPG" },
      { gen: "j11", from: 2013, to: 2021, file: "2015 Nissan Qashqai Acenta dCi - 1461cc 1.5 (110PS) Diesel - White - 04-2024, Front.jpg" },
      { gen: "j12", from: 2021, to: 2026, file: "2022 Nissan Qashqai Acenta Premium DIG-T - 1332cc 1.3 (160PS) Petrol - Red - 02-2025, Front.jpg" }
    ],
    "nissan|x-trail": [
      { gen: "t30", from: 2001, to: 2007, file: "'03-'04 Nissan X-Trail.JPG" },
      { gen: "t31", from: 2007, to: 2013, file: "Nissan X-Trail 2.5 LE Auto (2009) (52716228668).jpg" },
      { gen: "t32", from: 2014, to: 2021, file: "2017 Nissan X-Trail Tekna Dig-T facelift 1.6 Front.jpg" },
      { gen: "t33", from: 2021, to: 2026, file: "Nissan X-Trail (T33) 1X7A7179.jpg" }
    ],
    "nissan|leaf": [
      { gen: "ze0", from: 2011, to: 2017, file: "Nissan Leaf Front mittig.JPG" },
      { gen: "ze1", from: 2017, to: 2026, file: "2018 Nissan Leaf SV in Brilliant Silver, front left.jpg" }
    ],
    "nissan|ariya": [
      { gen: "fe0", from: 2022, to: 2026, file: "Nissan Ariya Automesse Ludwigsburg 2022 1X7A5877.jpg" }
    ],
    "nissan|navara": [
      { gen: "d22", from: 1998, to: 2005, file: "2004 Nissan Navara Diesel 4X4 2.5 Front.jpg" },
      { gen: "d40", from: 2005, to: 2015, file: "Nissan Navara front 20070518.jpg" },
      { gen: "d23", from: 2015, to: 2021, file: "2017 Nissan Navara Tekna DCi 2.3 Front.jpg" }
    ],
    "nissan|primastar": [
      { gen: "x83", from: 2001, to: 2014, file: "Nissan Primastar front 20080301.jpg" },
      { gen: "x82", from: 2022, to: 2026, file: "Nissan Primastar 2.0 dCi (2023) (53129718362).jpg" }
    ],
    "nissan|townstar": [
      { gen: "xfk", from: 2021, to: 2026, file: "Nissan Townstar Automesse Ludwigsburg 2022 1X7A5881.jpg" }
    ],
    "opel|adam": [
      { gen: "i", from: 2012, to: 2019, file: "Opel-Adam Black-front.JPG" }
    ],
    "opel|astra": [
      { gen: "g", from: 1998, to: 2005, file: "Opel Astra G front 20070322.jpg" },
      { gen: "h", from: 2004, to: 2014, file: "Opel Astra H 1.6 16V, SW, COSMO, front.jpg" },
      { gen: "j", from: 2009, to: 2015, file: "2010 Opel Astra J front.jpg" },
      { gen: "k", from: 2015, to: 2021, file: "2017 Opel Astra K CDTI Sports Tourer Dynamic Napred.jpg" },
      { gen: "l", from: 2021, to: 2026, file: "Opel Astra L 1X7A6738.jpg" }
    ],
    "opel|combo": [
      { gen: "b", from: 1993, to: 2001, file: "Opel Combo B (Portugal), front left side.jpg" },
      { gen: "c", from: 2001, to: 2011, file: "Opel Combo C front.jpg" },
      { gen: "d", from: 2011, to: 2018, file: "Opel Combo D Cargo.JPG" },
      { gen: "e", from: 2018, to: 2026, file: "2018 Opel Combo life front Ruesselsheim LWEOS1818.jpg" }
    ],
    "opel|corsa": [
      { gen: "c", from: 2000, to: 2006, file: "Opel Corsa C front.jpg" },
      { gen: "d", from: 2006, to: 2014, file: "Opel Corsa D front 20070611.jpg" },
      { gen: "e", from: 2014, to: 2019, file: "Opel Corsa 1.3 CDTI ecoFLEX Innovation (E) – Frontansicht, 24. Dezember 2015, Ratingen.jpg" },
      { gen: "f", from: 2019, to: 2026, file: "Opel Corsa F.jpg" }
    ],
    "opel|crossland": [
      { gen: "i", from: 2017, to: 2020, file: "2019 Opel Crossland X Front.jpg" },
      { gen: "i-fl", from: 2020, to: 2024, file: "Opel Crossland X 1.2 Turbo (2021) (53509305691).jpg" }
    ],
    "opel|grandland": [
      { gen: "i", from: 2017, to: 2021, file: "2017 Opel Grandland X 1.6 Turbo D Napred.jpg" },
      { gen: "i-fl", from: 2021, to: 2026, file: "Opel Grandland GSe Auto Zuerich 2023 1X7A0970.jpg" }
    ],
    "opel|insignia": [
      { gen: "a", from: 2008, to: 2017, file: "Opel Insignia front.JPG" },
      { gen: "b", from: 2017, to: 2022, file: "Opel Insignia Sports Tourer 20220313 HOF09506 RAW-Export 20220314001571cens.jpg" }
    ],
    "opel|meriva": [
      { gen: "a", from: 2003, to: 2010, file: "Opel Meriva front 20070611.jpg" },
      { gen: "b", from: 2010, to: 2017, file: "Opel Meriva 1.4 Design Edition (B) – Frontansicht, 11. März 2012, Heiligenhaus.jpg" }
    ],
    "opel|mokka": [
      { gen: "a", from: 2012, to: 2019, file: "Prague 2017 Opel Mokka X 1.jpg" },
      { gen: "b", from: 2020, to: 2026, file: "2021 Opel Mokka-e front view.jpg" }
    ],
    "opel|movano": [
      { gen: "a", from: 1998, to: 2010, file: "Opel Movano front 20071029.jpg" },
      { gen: "b", from: 2010, to: 2021, file: "OPEL-VAUX-MOVANO-B.jpg" },
      { gen: "c", from: 2021, to: 2026, file: "2024 Opel Movano, front left, 06-05-2025.jpg" }
    ],
    "opel|vivaro": [
      { gen: "a", from: 2001, to: 2014, file: "Opel Vivaro front 20080108.jpg" },
      { gen: "b", from: 2014, to: 2019, file: "2015 Opel Vivaro in Glacier White, front right, 06-05-2025.jpg" },
      { gen: "c", from: 2019, to: 2026, file: "Opel Vivaro C IMG 8239.jpg" }
    ],
    "opel|zafira": [
      { gen: "a", from: 1999, to: 2005, file: "Opel Zafira A OPC front.jpg" },
      { gen: "b", from: 2005, to: 2011, file: "Opel Zafira B 1.9 CDTI front.JPG" },
      { gen: "c", from: 2011, to: 2019, file: "Opel Zafira Tourer (front).jpg" },
      { gen: "life", from: 2019, to: 2026, file: "Opel Zafira Life (Facelift) IMG 9905.jpg" }
    ],
    "peugeot|108": [
      { gen: "i", from: 2014, to: 2021, file: "2015 Peugeot 108 Active Front.jpg" }
    ],
    "peugeot|2008": [
      { gen: "i", from: 2013, to: 2019, file: "2013 Peugeot 2008 Allure 1.2 Front.jpg" },
      { gen: "ii", from: 2019, to: 2026, file: "2023 Peugeot 2008 in Vertigo Blue, front left, 06-08-2025.jpg" }
    ],
    "peugeot|208": [
      { gen: "i", from: 2012, to: 2019, file: "2017 Peugeot 208 Active 1.2 facelift Front.jpg" },
      { gen: "ii", from: 2019, to: 2026, file: "2020 Peugeot 208 GT Line PureTech 1.2 Front.jpg" }
    ],
    "peugeot|3008": [
      { gen: "i", from: 2009, to: 2016, file: "Peugeot 3008 front - PSM 2009.jpg" },
      { gen: "ii", from: 2016, to: 2023, file: "2016 Peugeot 3008 (P84E) looking from front.jpg" },
      { gen: "iii", from: 2023, to: 2026, file: "Peugeot 3008 Hybrid, Paris (20260719-P1270418).jpg" }
    ],
    "peugeot|308": [
      { gen: "t7", from: 2007, to: 2014, file: "2012 Peugeot 308 in Babylon Red, front left, 06-08-2025.jpg" },
      { gen: "t9", from: 2014, to: 2021, file: "2018 Peugeot 308 (T9 MY18) Allure hatchback (2018-07-19) 01.jpg" },
      { gen: "p5", from: 2021, to: 2026, file: "Peugeot 308 P5 Nera Black (6).jpg" }
    ],
    "peugeot|408": [
      { gen: "i", from: 2022, to: 2026, file: "Peugeot 408 PureTech 130 (2025) (55075555297).jpg" }
    ],
    "peugeot|5008": [
      { gen: "i", from: 2009, to: 2017, file: "Peugeot 5008 1.6 HDi FAP 110 (2012) (52924866355).jpg" },
      { gen: "ii", from: 2017, to: 2024, file: "2017 Peugeot 5008 GT Line 1.2 Front.jpg" },
      { gen: "iii", from: 2024, to: 2026, file: "Peugeot 5008 C Leonberg 2024 IMG 0827.jpg" }
    ],
    "peugeot|508": [
      { gen: "i", from: 2010, to: 2018, file: "Peugeot 508 white front Poznan 2011.jpg" },
      { gen: "ii", from: 2018, to: 2026, file: "2019 Peugeot 508 First Edition Front.jpg" }
    ],
    "peugeot|boxer": [
      { gen: "i", from: 1994, to: 2006, file: "1997 Peugeot Boxer 320M 2.0 (51959081937).jpg" },
      { gen: "ii", from: 2006, to: 2014, file: "Peugeot Boxer Tole 2.2 HDi 2008 (8760784287).jpg" },
      { gen: "ii-fl", from: 2014, to: 2026, file: "Peugeot Boxer II 2,2 HDi (2018) (53464972459).jpg" }
    ],
    "peugeot|expert": [
      { gen: "i", from: 1995, to: 2007, file: "2005 Peugeot Expert 900 HDi facelift 2.0 Front.jpg" },
      { gen: "ii", from: 2007, to: 2016, file: "Peugeot Expert (II) – Frontansicht, 22. Mai 2011, Ratingen.jpg" },
      { gen: "iii", from: 2016, to: 2026, file: "Peugeot Expert III 1X7A0318.jpg" }
    ],
    "peugeot|partner": [
      { gen: "i", from: 1996, to: 2008, file: "Peugeot Partner Quicksilver HDI (2005) (52181857243).jpg" },
      { gen: "ii", from: 2008, to: 2018, file: "2018 Peugeot Partner Tepee Active Front.jpg" },
      { gen: "iii", from: 2018, to: 2026, file: "2019 Peugeot Partner Professional L1 BlueHDi 1.5 Front.jpg" }
    ],
    "peugeot|rifter": [
      { gen: "i", from: 2018, to: 2026, file: "2018 Peugeot Rifter Allure BlueHDi 1.6 Front.jpg" }
    ],
    "peugeot|traveller": [
      { gen: "i", from: 2016, to: 2026, file: "2019 Peugeot Traveller Business BlueHDi 2.0 Front.jpg" }
    ],
    "polestar|2": [
      { gen: "ps2", from: 2020, to: 2026, file: "2023 Polestar 2 FWD EV (23856).jpg" }
    ],
    "porsche|macan": [
      { gen: "i", from: 2014, to: 2024, file: "Porsche Macan (2020) (front three-quarter view) in Osaka.jpg" },
      { gen: "ii", from: 2024, to: 2026, file: "Porsche Macan II 001.jpg" }
    ],
    "renault|arkana": [
      { gen: "i", from: 2021, to: 2026, file: "Renault Arkana TCe 160 (2023) (54809541897).jpg" }
    ],
    "renault|austral": [
      { gen: "i", from: 2022, to: 2026, file: "2024 Renault Austral Techno Esprit Alpine HEV Automatic 1.2 Front.jpg" }
    ],
    "renault|captur": [
      { gen: "i", from: 2013, to: 2019, file: "Renault Captur Mk1 (facelift) - Front View.jpg" },
      { gen: "ii", from: 2019, to: 2026, file: "Renault Captur II (front).jpg" }
    ],
    "renault|clio": [
      { gen: "i", from: 1990, to: 1998, file: "Renault Clio RT 1.8 front.JPG" },
      { gen: "ii", from: 1998, to: 2012, file: "Renault Clio 141929.jpg" },
      { gen: "iii", from: 2005, to: 2014, file: "2006 Renault Clio Dynamique 1.6 Front.jpg" },
      { gen: "iv", from: 2012, to: 2019, file: "2013 Renault Clio in Diamond Black, front right, 06-08-2025.jpg" },
      { gen: "v", from: 2019, to: 2026, file: "2020 Renault Clio Play TCe - 999cc 1.0 (100PS) Petrol - Iron Blue - 05-2024, Front.jpg" }
    ],
    "renault|espace": [
      { gen: "iii", from: 1996, to: 2002, file: "Renault Espace III front 20080215.jpg" },
      { gen: "iv", from: 2002, to: 2014, file: "Moscow, Renault Espace IV white, June 2026 01.jpg" },
      { gen: "v", from: 2015, to: 2023, file: "Renault Espace V front.jpg" },
      { gen: "vi", from: 2023, to: 2026, file: "2025 Renault Espace VI 01.jpg" }
    ],
    "renault|kadjar": [
      { gen: "i", from: 2015, to: 2022, file: "2016 Renault Kadjar Dynamique NAV DCi 1.5 Front.jpg" }
    ],
    "renault|kangoo": [
      { gen: "i", from: 1997, to: 2008, file: "2004 Renault Kangoo SL19 DCi 70 1.5 Front.jpg" },
      { gen: "ii", from: 2008, to: 2021, file: "Renault Kangoo II front.jpg" },
      { gen: "iii", from: 2021, to: 2026, file: "2023 Renault Kangoo Advance ML19 dCi - 1461cc 1.5 (95PS) Diesel - Mineral White - 02-2024, Front.jpg" }
    ],
    "renault|master": [
      { gen: "ii", from: 1998, to: 2010, file: "Renault Master front 20080326.jpg" },
      { gen: "iii", from: 2010, to: 2024, file: "2022 Renault Master LWB front.jpg" },
      { gen: "iv", from: 2024, to: 2026, file: "2025 Renault Master in Urban Grey, front right, 06-12-2025.jpg" }
    ],
    "renault|megane": [
      { gen: "i", from: 1995, to: 2002, file: "1998 (R) Renault Mégane.jpg" },
      { gen: "ii", from: 2002, to: 2008, file: "2003 Renault Mégane Dynamique 1.9dCi 120 (Front).jpg" },
      { gen: "iii", from: 2008, to: 2016, file: "2011 Renault Mégane (B32) Privilege hatchback (front).jpg" },
      { gen: "iv", from: 2016, to: 2023, file: "Renault MEGANE GT Line (ABA-BBH5F) front.jpg" },
      { gen: "v", from: 2022, to: 2026, file: "Renault Megane E-Tech 1X7A6016.jpg" }
    ],
    "renault|scenic": [
      { gen: "i", from: 1996, to: 2003, file: "1998 Renault Scenic RT 1.6E Auto.jpg" },
      { gen: "ii", from: 2003, to: 2009, file: "2004 Renault Scenic Privilege 16V Automatic 1.6 Front.jpg" },
      { gen: "iii", from: 2009, to: 2016, file: "Renault Scénic (III) – Frontansicht, 2. Juli 2011, Ratingen.jpg" },
      { gen: "iv", from: 2016, to: 2022, file: "2017 Renault Scenic Dynamique NAV DCi 1.5 Front.jpg" },
      { gen: "e", from: 2024, to: 2026, file: "Renault Scénic E-Tech IAA 2023 1X7A0344.jpg" }
    ],
    "renault|talisman": [
      { gen: "i", from: 2015, to: 2022, file: "Renault Talisman Saloon.jpg" }
    ],
    "renault|trafic": [
      { gen: "ii", from: 2001, to: 2014, file: "Renault Trafic front 20080106.jpg" },
      { gen: "iii", from: 2014, to: 2026, file: "2017 Renault Trafic dCi Crew front.jpg" }
    ],
    "renault|twingo": [
      { gen: "i", from: 1993, to: 2007, file: "Renault Twingo front 20080222.jpg" },
      { gen: "ii", from: 2007, to: 2014, file: "Renault Twingo Mk2 (48607).jpg" },
      { gen: "iii", from: 2014, to: 2024, file: "Renault Twingo Dynamique (III) – Frontansicht, 24. Oktober 2015, Münster.jpg" }
    ],
    "renault|zoe": [
      { gen: "i", from: 2012, to: 2019, file: "White Renault Zoe (front).jpg" },
      { gen: "ii", from: 2019, to: 2024, file: "Renault Zoe R110 Z.E. 50 Experience (Facelift) – f 22112020.jpg" }
    ],
    "seat|alhambra": [
      { gen: "7n", from: 2010, to: 2015, file: "2012 SEAT Alhambra SE Ecomotive CR 2.0 Front.jpg" },
      { gen: "7n-fl", from: 2015, to: 2020, file: "Seat Alhambra Style (II, Facelift) – f 20052021.jpg" }
    ],
    "seat|arona": [
      { gen: "mk1", from: 2017, to: 2026, file: "2018 SEAT Arona SE Technology TSi 1.0 Front (1).jpg" }
    ],
    "seat|ateca": [
      { gen: "mk1", from: 2016, to: 2026, file: "SEAT Ateca Front Full LED Lightning.jpg" }
    ],
    "seat|exeo": [
      { gen: "mk1", from: 2008, to: 2013, file: "Seat Exeo 20090603 front.JPG" }
    ],
    "seat|ibiza": [
      { gen: "6k", from: 1993, to: 2002, file: "Seat Ibiza II 6K 1391cc registered August 1995 (cropped).jpg" },
      { gen: "6l", from: 2002, to: 2008, file: "2005 SEAT Ibiza Sport - 1.4 16V (75PS) petrol manual - 2025-04-05, front left.jpg" },
      { gen: "6j", from: 2008, to: 2017, file: "Seat Ibiza (6J) – Frontansicht, 25. April 2011, Ratingen.jpg" },
      { gen: "6f", from: 2017, to: 2026, file: "2018 SEAT Ibiza SE Technology MPi 1.0 Front.jpg" }
    ],
    "seat|leon": [
      { gen: "1m", from: 1999, to: 2006, file: "Seat Leon front 20080226.jpg" },
      { gen: "1p", from: 2005, to: 2012, file: "Seat Leon (1P) – Frontansicht, 17. April 2011, Düsseldorf.jpg" },
      { gen: "5f", from: 2012, to: 2020, file: "Seat Leon 1.4 TSI Start&Stop Style (III) – Frontansicht, 10. August 2013, Ratingen.jpg" },
      { gen: "kl", from: 2020, to: 2026, file: "Seat Leon FR (IV) – f 01012023.jpg" }
    ],
    "seat|mii": [
      { gen: "mk1", from: 2011, to: 2021, file: "2015 SEAT Mii S AC 1.0 (Front).jpg" }
    ],
    "seat|tarraco": [
      { gen: "mk1", from: 2018, to: 2024, file: "2019 SEAT Tarraco SE Tech TDi 4Drive SA 2.0 Front (1).jpg" }
    ],
    "seat|toledo": [
      { gen: "iv", from: 2012, to: 2019, file: "2014 SEAT Toledo SE TSi 1.2 Front.jpg" }
    ],
    "skoda|citigo": [
      { gen: "nf", from: 2011, to: 2020, file: "2018 Skoda Citigo SE MPi 1.0 Front.jpg" }
    ],
    "skoda|enyaq": [
      { gen: "ny", from: 2020, to: 2026, file: "Škoda Enyaq - front view.jpg" }
    ],
    "skoda|fabia": [
      { gen: "6y", from: 1999, to: 2007, file: "2001 Skoda Fabia Comfort 8V 1.4 Front.jpg" },
      { gen: "5j", from: 2007, to: 2014, file: "Skoda Fabia II front.jpg" },
      { gen: "nj", from: 2014, to: 2021, file: "2018 Skoda Fabia SE MPi 1.0 Front.jpg" },
      { gen: "pj", from: 2021, to: 2026, file: "Škoda Fabia IV 1.0 MPI (2022) (52197085072).jpg" }
    ],
    "skoda|kamiq": [
      { gen: "nw", from: 2019, to: 2026, file: "2019 Skoda Kamiq SE L TSi 1.0 Front.jpg" }
    ],
    "skoda|karoq": [
      { gen: "nu", from: 2017, to: 2026, file: "Skoda Karoq (front), 2017.jpg" }
    ],
    "skoda|kodiaq": [
      { gen: "ns", from: 2016, to: 2024, file: "DSC05746 Unmarked Škoda Kodiaq, Bundesheer, Front Left, 2023-10.jpg" },
      { gen: "nu", from: 2024, to: 2026, file: "Škoda Kodiaq II IMG 9433.jpg" }
    ],
    "skoda|octavia": [
      { gen: "mk1", from: 1996, to: 2004, file: "Skoda Octavia I front 20080213.jpg" },
      { gen: "mk2", from: 2004, to: 2013, file: "Skoda Octavia 1.9 TDi Ambiente 2007 (25812649166).jpg" },
      { gen: "mk3", from: 2013, to: 2020, file: "Skoda Octavia 1.6 TDi Elegance 2015 (50196535958).jpg" },
      { gen: "mk4", from: 2020, to: 2026, file: "2021 Skoda Octavia SE First Edition TSi e-TEC SA 1.0 Front.jpg" }
    ],
    "skoda|scala": [
      { gen: "nw", from: 2019, to: 2026, file: "2019 Skoda Scala SE TDi 1.6 Front.jpg" }
    ],
    "skoda|superb": [
      { gen: "3u", from: 2001, to: 2008, file: "2005 Skoda Superb Elegance TDi 1.9 Front.jpg" },
      { gen: "3t", from: 2008, to: 2015, file: "Škoda Superb II 2013 (front).JPG" },
      { gen: "3v", from: 2015, to: 2024, file: "Škoda Superb III 2.0 TDI (2019) (52067045307).jpg" },
      { gen: "b9", from: 2024, to: 2026, file: "Škoda Superb IV Combi Automesse Ludwigsburg 2024 IMG 1477.jpg" }
    ],
    "tesla|model-3": [
      { gen: "pre", from: 2017, to: 2023, file: "2019 Tesla Model 3 Long Range AWD Front.jpg" },
      { gen: "highland", from: 2023, to: 2026, file: "Tesla Model 3 (Highland, facelift) (front three-quarter view) at Tesla Osaka Ibaraki.jpg" }
    ],
    "tesla|model-y": [
      { gen: "my", from: 2020, to: 2026, file: "2024 Tesla Model Y Long Range, front left, 08-21-2026.jpg" }
    ],
    "tesla|model-s": [
      { gen: "s1", from: 2012, to: 2021, file: "20180630 Tesla Model S 70D 2015 midnight blue left front.jpg" },
      { gen: "s2", from: 2021, to: 2026, file: "2021 Tesla Model S P2 Long Range front right view.jpg" }
    ],
    "tesla|model-x": [
      { gen: "x1", from: 2015, to: 2021, file: "2017 Tesla Model X 100D Front.jpg" },
      { gen: "x2", from: 2021, to: 2026, file: "Tesla-X-Plaid-front.jpg" }
    ],
    "mg|mg4": [
      { gen: "mg4", from: 2022, to: 2026, file: "MG4 EV DSC 7236.jpg" }
    ],
    "mg|mg5": [
      { gen: "ev", from: 2020, to: 2024, file: "MG 5 EV (EP22) 1X7A6207.jpg" },
      { gen: "evfl", from: 2024, to: 2026, file: "MG 5 EV (EP22) FL 1X7A0338.jpg" }
    ],
    "mg|zs": [
      { gen: "zs1", from: 2017, to: 2024, file: "MG ZS CN 002 China 2017-03-30.jpg" },
      { gen: "zsev", from: 2019, to: 2024, file: "2019 MG ZS Exclusive EV.jpg" },
      { gen: "zs2", from: 2024, to: 2026, file: "MG ZS (crossover, second generation) DSC 8542.jpg" }
    ],
    "mg|hs": [
      { gen: "hs1", from: 2018, to: 2024, file: "MG HS PHEV IMG 5526.jpg" },
      { gen: "hs2", from: 2024, to: 2026, file: "2024 MG HS 5.jpg" }
    ],
    "mg|marvel-r": [
      { gen: "mr", from: 2021, to: 2024, file: "MG Marvel R 1X7A0401.jpg" }
    ],
    "mg|cyberster": [
      { gen: "cy", from: 2024, to: 2026, file: "MG Cyberster GIMS 2024 1X7A2009.jpg" }
    ],
    "byd|atto-3": [
      { gen: "atto3", from: 2022, to: 2026, file: "BYD Atto 3 (front) (1).jpg" }
    ],
    "byd|dolphin": [
      { gen: "dolphin", from: 2023, to: 2026, file: "2024 BYD Dolphin EV in Cream White, front left, 06-22-2024.jpg" }
    ],
    "byd|seal": [
      { gen: "seal", from: 2023, to: 2026, file: "BYD Seal IAA 2023 1X7A0026.jpg" }
    ],
    "byd|seal-u": [
      { gen: "sealu", from: 2024, to: 2026, file: "BYD Seal U EV DSC 8762.jpg" }
    ],
    "byd|han": [
      { gen: "han", from: 2021, to: 2026, file: "BYD Han EV IAA 2023 1X7A0646.jpg" }
    ],
    "byd|tang": [
      { gen: "tang", from: 2021, to: 2026, file: "2024 BYD Tang GIMS 2024 1X7A2342.jpg" }
    ],
    "porsche|911": [
      { gen: "996", from: 1997, to: 2004, file: "Porsche 996 Coupé 1.JPG" },
      { gen: "9971", from: 2004, to: 2008, file: "Porsche 997 Carrera (2004) coupes IMG 7311.jpg" },
      { gen: "9972", from: 2008, to: 2012, file: "Porsche 911 Carrera S Coupé (997, Facelift) – Frontansicht, 17. April 2011, Düsseldorf.jpg" },
      { gen: "991", from: 2011, to: 2019, file: "Porsche 991 911 Carrera 4S Carmine Red (1).jpg" },
      { gen: "992", from: 2019, to: 2026, file: "Porsche 992 911 Carrera S White (1).jpg" }
    ],
    "porsche|cayenne": [
      { gen: "9pa", from: 2002, to: 2010, file: "Porsche Cayenne Turbo 9PA silver (1).jpg" },
      { gen: "92a", from: 2010, to: 2018, file: "Porsche Cayenne S (92A) – Frontansicht, 10. Oktober 2011, Wülfrath.jpg" },
      { gen: "9ya", from: 2018, to: 2023, file: "2018 Porsche Cayenne V8 Turbo Tiptronic 4.0 Front.jpg" },
      { gen: "9yb", from: 2023, to: 2026, file: "2023 Porsche Cayenne S IAA 2023 1X7A0025.jpg" }
    ],
    "porsche|macan": [
      { gen: "95b", from: 2014, to: 2018, file: "Porsche Macan S (95B) Washington DC Metro Area, USA.jpg" },
      { gen: "95bfl", from: 2018, to: 2024, file: "2019 Porsche Macan S S-A facelift 3.0 Front.jpg" },
      { gen: "xab", from: 2024, to: 2026, file: "Porsche Macan Electric XAB Jet Black Metallic 01.jpg" }
    ],
    "porsche|panamera": [
      { gen: "970", from: 2009, to: 2016, file: "Porsche Panamera Turbo (970) (18689485265).jpg" },
      { gen: "971", from: 2016, to: 2026, file: "2017 Porsche Panamera S-A 3.0 Front.jpg" }
    ],
    "porsche|taycan": [
      { gen: "9j1", from: 2019, to: 2024, file: "Porsche Taycan Turbo S (2020) (53332259163).jpg" },
      { gen: "9j1ii", from: 2024, to: 2026, file: "Porsche 9J1.2 Taycan Turbo GT Purple Sky Metallic (1).jpg" }
    ],
    "porsche|boxster": [
      { gen: "986", from: 1996, to: 2004, file: "Porsche 986 Boxster roadster green (1).jpg" },
      { gen: "987", from: 2004, to: 2012, file: "2005-2008 Porsche Boxster (987) S convertible (2015-10-07) 01.jpg" },
      { gen: "981", from: 2012, to: 2016, file: "2013 Porsche Boxster -- 2012 NYIAS.JPG" },
      { gen: "718", from: 2016, to: 2026, file: "Porsche 718 Boxster GTS 4.0 1X7A0320.jpg" }
    ],
    "porsche|cayman": [
      { gen: "987c", from: 2005, to: 2012, file: "2006 Porsche Cayman (987) S coupe (2015-06-03) 01.jpg" },
      { gen: "981c", from: 2013, to: 2016, file: "2014 Porsche Cayman S (face).jpg" },
      { gen: "718c", from: 2016, to: 2026, file: "Porsche 718 Cayman GTS 1X7A7165.jpg" }
    ],
    "toyota|aygo": [
      { gen: "ab10", from: 2005, to: 2014, file: "Toyota Aygo front 20080227.jpg" },
      { gen: "ab40", from: 2014, to: 2022, file: "2017 Toyota Aygo X-Style VVT-I 1.0 Front.jpg" },
      { gen: "aygo-x", from: 2022, to: 2026, file: "2022 Toyota Aygo X 1.0 VVT-i front.jpg" }
    ],
    "toyota|bz4x": [
      { gen: "bz4x", from: 2022, to: 2026, file: "2022 Toyota bZ4X Motion EV - 71kWh (203PS) Electric - Dark Blue - 12-2023, Front.jpg" }
    ],
    "toyota|c-hr": [
      { gen: "ax10", from: 2016, to: 2023, file: "2017 Toyota C-HR Icon HEV CVT 1.8 Front.jpg" },
      { gen: "ax20", from: 2023, to: 2026, file: "2024 Toyota C-HR 2.0 HEV Premiere Edition in Sulfur Bi-tone color (Front).jpg" }
    ],
    "toyota|camry": [
      { gen: "xv30", from: 2001, to: 2006, file: "2003 Toyota Camry LE, Front Left, 04-17-2020.jpg" },
      { gen: "xv40", from: 2006, to: 2011, file: "2007 Toyota Camry (XV40) 2.4 V (front), West Surabaya.jpg" },
      { gen: "xv50", from: 2011, to: 2018, file: "2012 Toyota Camry XLE in Attitude Black, Front Left, 08-30-2022.jpg" },
      { gen: "xv70", from: 2018, to: 2026, file: "2019 Toyota Camry LE in white, front left.jpg" }
    ],
    "toyota|corolla": [
      { gen: "e120", from: 2002, to: 2007, file: "2003 Toyota Corolla Altis (Front).jpg" },
      { gen: "e140", from: 2007, to: 2013, file: "2010 Toyota Corolla CE Convenience Package in Desert Sand Mica, Front Left, 2024-03-12.jpg" },
      { gen: "e170", from: 2013, to: 2018, file: "Toyota COROLLA S (E170) front.JPG" },
      { gen: "e210", from: 2018, to: 2026, file: "2019 Toyota Corolla Altis (front).jpg" }
    ],
    "toyota|hilux": [
      { gen: "vi", from: 1997, to: 2005, file: "1998 Toyota HiLux Turbo 2.4.jpg" },
      { gen: "an10", from: 2005, to: 2015, file: "Toyota Hilux AN10 2.5 E 4x2 Grayish Brown Metallic - front.jpg" },
      { gen: "an120", from: 2015, to: 2026, file: "2017 Toyota Hilux Invincible X D-4D 4WD 2.4 Front.jpg" }
    ],
    "toyota|land-cruiser": [
      { gen: "j100", from: 1998, to: 2007, file: "2001 Toyota Land Cruiser 100 4.2TD VX in White, front left.jpg" },
      { gen: "j200", from: 2007, to: 2021, file: "2014 Toyota Land Cruiser 200 VX V8 in Black, front right.jpg" },
      { gen: "j300", from: 2021, to: 2026, file: "2021 Toyota Land Cruiser 300 (Russia) front view.jpg" }
    ],
    "toyota|prius": [
      { gen: "xw10", from: 1997, to: 2003, file: "1998 Toyota Prius NHW10 Silver Strara Metallic (front).jpg" },
      { gen: "xw20", from: 2003, to: 2009, file: "2005 Toyota Prius T Spirit VVT-i Automatic 1.5 Front.jpg" },
      { gen: "xw30", from: 2009, to: 2015, file: "2010 Toyota Prius front.JPG" },
      { gen: "xw50", from: 2015, to: 2022, file: "Toyota PRIUS S (DAA-ZVW50-AHXEB) front.JPG" },
      { gen: "xw60", from: 2023, to: 2026, file: "2023 Toyota Prius HEV front view.jpg" }
    ],
    "toyota|proace": [
      { gen: "proace-i", from: 2013, to: 2016, file: "2014 Toyota Proace 1200 L1H1 HDi 2.0 Front.jpg" },
      { gen: "proace-ii", from: 2016, to: 2024, file: "2018 Toyota Proace Comfort 2.0 Front.jpg" },
      { gen: "proace-iii", from: 2024, to: 2026, file: "2024 Toyota ProAce IMG 9982.jpg" }
    ],
    "toyota|rav4": [
      { gen: "xa20", from: 2000, to: 2006, file: "2002 Toyota Rav4 L 2-Door in Super White, Front Right, 03-17-2023.jpg" },
      { gen: "xa30", from: 2006, to: 2012, file: "Toyota RAV4 front 20071007.jpg" },
      { gen: "xa40", from: 2012, to: 2018, file: "2015 Toyota Rav4 LE in Barcelona Red Metallic, Front Right, 04-16-2022.jpg" },
      { gen: "xa50", from: 2018, to: 2026, file: "2021 Toyota RAV4 XLE AWD, front right.jpg" }
    ],
    "toyota|supra": [
      { gen: "a70", from: 1986, to: 1993, file: "1989 Toyota A70 Supra MkIII 3.0 GT Turbo.jpg" },
      { gen: "a80", from: 1993, to: 2002, file: "The frontview of Toyota Supra RZ Mid-year 1995.jpg" },
      { gen: "a90", from: 2019, to: 2026, file: "2020 Toyota GR Supra 3.0 Turbo in Prominence Red, front right.jpg" }
    ],
    "toyota|yaris": [
      { gen: "xp10", from: 1999, to: 2005, file: "2000 Toyota Yaris S 1.0 (Front).jpg" },
      { gen: "xp90", from: 2005, to: 2011, file: "Toyota Yaris 1.3 VVT-i front.JPG" },
      { gen: "xp13", from: 2011, to: 2020, file: "Toyota Yaris (XP130) – Frontansicht, 21. Juli 2012, Heiligenhaus.jpg" },
      { gen: "xp21", from: 2020, to: 2026, file: "2020 Toyota Yaris Design HEV CVT 1.5 Front.jpg" }
    ],
    "toyota|yaris-cross": [
      { gen: "mxpj10", from: 2021, to: 2026, file: "Toyota YARIS CROSS HYBRID X 2WD (6AA-MXPJ10-BHXRB) front.jpg" }
    ],
    "volkswagen|golf": [
      { gen: "mk4", from: 1997, to: 2003, file: "Volkswagen Golf IV Sanming 02 2022-01-17.jpg" },
      { gen: "mk5", from: 2003, to: 2008, file: "Volkswagen Golf V 191811.jpg" },
      { gen: "mk6", from: 2008, to: 2012, file: "2010 Volkswagen Golf 2.5 Comfortline 5-Door in Reflex Silver Metallic, front right, 2024-09-26.jpg" },
      { gen: "mk7", from: 2012, to: 2020, file: "Volkswagen Golf VII GTI (KW P 36).jpg" },
      { gen: "mk8", from: 2019, to: 2026, file: "Volkswagen Golf VIII (2019 - 2022) (52011585451).jpg" }
    ],
    "volkswagen|id-3": [
      { gen: "e1", from: 2020, to: 2026, file: "Volkswagen ID.3 IMG 4819.jpg" }
    ],
    "volkswagen|id-4": [
      { gen: "e2", from: 2020, to: 2026, file: "Volkswagen ID.4 Pro (ZAA-E2EBJ) front.jpg" }
    ],
    "volkswagen|passat": [
      { gen: "b5", from: 1996, to: 2005, file: "1999 Volkswagen Passat S 20V 1.8 Front.jpg" },
      { gen: "b6", from: 2005, to: 2010, file: "2008 Volkswagen Passat Komfort 2.0T in Candy White, Front Left, 08-01-2022.jpg" },
      { gen: "b7", from: 2010, to: 2014, file: "2013 Volkswagen Passat 1.8 TSI (Test Drive Car) in Glenmarie, Malaysia.jpg" },
      { gen: "b8", from: 2014, to: 2023, file: "Volkswagen Passat (B8) – front view (2017).jpg" },
      { gen: "b9", from: 2023, to: 2026, file: "Volkswagen PASSAT eHybrid R-Line (3LA-CJ15V) front.jpg" }
    ],
    "volkswagen|polo": [
      { gen: "6n2", from: 1999, to: 2001, file: "Volkswagen Polo (27162607343).jpg" },
      { gen: "9n", from: 2001, to: 2009, file: "2004 Volkswagen Polo Twist - 1198cc 64PS Petrol - Indigo Blue Pearl Effect - 26-04-23, Front Left.jpg" },
      { gen: "6r", from: 2009, to: 2017, file: "Volkswagen Polo 073537505.jpg" },
      { gen: "aw", from: 2017, to: 2026, file: "AW POLO TrendLine.jpg" }
    ],
    "volkswagen|t-roc": [
      { gen: "a11", from: 2017, to: 2026, file: "2018 Volkswagen T-Roc Front (2).jpg" }
    ],
    "volkswagen|tiguan": [
      { gen: "5n", from: 2007, to: 2016, file: "Volkswagen Tiguan CN Shishi 01 2021-12-24.jpg" },
      { gen: "ad", from: 2016, to: 2023, file: "Moscow, Volkswagen Tiguan red, Sept 2025 01.jpg" },
      { gen: "ct", from: 2023, to: 2026, file: "Volkswagen TIGUAN eTSI R-Line (3AA-CT15) front.jpg" }
    ],
    "volkswagen|taigo": [
      { gen: "cs", from: 2020, to: 2026, file: "2022 Volkswagen Taigo Style TSI S-A 1.0 Front.jpg" }
    ],
    "volkswagen|touran": [
      { gen: "1t", from: 2003, to: 2015, file: "2005 Volkswagen Touran (import) front.jpg" },
      { gen: "5t", from: 2015, to: 2023, file: "Volkswagen Golf Touran TSI R-Line (DBA-1TCZD) front.jpg" }
    ],
    "volkswagen|sharan": [
      { gen: "7m", from: 1995, to: 2010, file: "Volkswagen Sharan I Cruise 1.9 TDI (2004) (52053468225).jpg" },
      { gen: "7n", from: 2010, to: 2022, file: "2014 Volkswagen Sharan SE BlueMotion TDi 2.0 Front.jpg" }
    ],
    "volkswagen|transporter": [
      { gen: "t4", from: 1990, to: 2003, file: "VW T4 front 20070926.jpg" },
      { gen: "t5", from: 2003, to: 2015, file: "DSC06091 Volkswagen T5, KHD Wien, Front Left, 2023-10.jpg" },
      { gen: "t6", from: 2015, to: 2024, file: "DSC05992 Volkswagen T6, Marktamt Stadt Wien, Front Left, 2023-10.jpg" },
      { gen: "t7", from: 2021, to: 2026, file: "Volkswagen T7 Multivan 2.0 TDI (2022) (52925900439).jpg" }
    ],
    "volkswagen|id-5": [
      { gen: "e3", from: 2021, to: 2026, file: "Grey VW ID.5 (front).jpg" }
    ],
    "volkswagen|id-7": [
      { gen: "e7", from: 2023, to: 2026, file: "2024 Volkswagen ID.7 77kWh Pro (Front).jpg" }
    ],
    "volkswagen|scirocco": [
      { gen: "53", from: 1974, to: 1981, file: "1976 Volkswagen Scirocco 1.5 LS front.jpg" },
      { gen: "53b", from: 1981, to: 1992, file: "1988 Volkswagen Scirocco Slegato Edition in Gambia Red, Front Right, 08-14-2022.jpg" },
      { gen: "1k8", from: 2008, to: 2017, file: "Blue VW Scirocco III R fr IAA 2009.JPG" }
    ],
    "volkswagen|beetle": [
      { gen: "1y", from: 1997, to: 2011, file: "1999 Volkswagen New Beetle GLS, front left, 06-13-2023.jpg" },
      { gen: "5c", from: 2011, to: 2019, file: "2015 Volkswagen Beetle 1.4 TSI Design, front right, 07-13-2024.jpg" }
    ],
    "volkswagen|t-cross": [
      { gen: "c1", from: 2018, to: 2026, file: "VOLKSWAGEN T-CROSS 1.0 TSi 7DSG R-LINE black front view in Brunei.jpg" }
    ],
    "volkswagen|touareg": [
      { gen: "7l", from: 2002, to: 2010, file: "2005 Volkswagen Touareg V6 Sport Automatic 3.2 Front.jpg" },
      { gen: "7p", from: 2010, to: 2018, file: "Volkswagen Touareg 3.0 V6 TDI 4Motion (2014) (52076868515).jpg" },
      { gen: "cr", from: 2018, to: 2026, file: "2019 Volkswagen Touareg V6 R-Line Tech TD 3.0 Front.jpg" }
    ],
    "volkswagen|arteon": [
      { gen: "3h", from: 2017, to: 2026, file: "2017 Volkswagen Arteon Front.jpg" }
    ],
    "volkswagen|caddy": [
      { gen: "9k", from: 1995, to: 2004, file: "1999 Volkswagen Caddy Diesel 1.9 Front.jpg" },
      { gen: "2k", from: 2004, to: 2020, file: "2007 Volkswagen Caddy in Candy White, front left, 06-06-2025.jpg" },
      { gen: "sb", from: 2020, to: 2026, file: "2021 Volkswagen Caddy C20 Commerce Pro TD 2.0 Front.jpg" }
    ],
    "volkswagen|caravelle": [
      { gen: "t4", from: 1990, to: 2003, file: "Volkswagen Caravelle T4 1990-1995 front.jpg" },
      { gen: "t5", from: 2003, to: 2015, file: "Volkswagen T5 Caravelle (2009) (52075904509).jpg" },
      { gen: "t6", from: 2015, to: 2024, file: "Volkswagen T6 Caravelle (2018) (52716172445).jpg" },
      { gen: "t7", from: 2024, to: 2026, file: "Volkswagen Caravelle 4Motion T7, Auto 2025, Zurich (20251029-P1074404).jpg" }
    ],
    "volkswagen|amarok": [
      { gen: "2h", from: 2010, to: 2022, file: "Volkswagen Amarok front Poznan 2011.jpg" },
      { gen: "t1", from: 2022, to: 2026, file: "VW Amarok Bergrettung, IAA 2024, Hanover (P1200183).jpg" }
    ],
    "volkswagen|up": [
      { gen: "aa", from: 2011, to: 2023, file: "Volkswagen up! 3door front.jpg" }
    ],
    "volvo|ex30": [
      { gen: "ex30", from: 2023, to: 2026, file: "2024 Volvo EX30 Front.jpg" }
    ],
    "volvo|ex90": [
      { gen: "ex90", from: 2023, to: 2026, file: "2023 Volvo EX90 (China) front view.png" }
    ],
    "volvo|s60": [
      { gen: "p2", from: 2000, to: 2009, file: "2004 Volvo S60 2.5T, Front Right, 11-21-2021.jpg" },
      { gen: "y20", from: 2010, to: 2018, file: "2013 Volvo S60 Polestar Limited Edition front.jpg" },
      { gen: "spa", from: 2019, to: 2026, file: "2019 Volvo S60 T5, front 1.26.20.jpg" }
    ],
    "volvo|s90": [
      { gen: "spa", from: 2016, to: 2026, file: "2017 Volvo S90 Momentum D4 Automatic 2.0 Front.jpg" }
    ],
    "volvo|v40": [
      { gen: "v1", from: 1995, to: 2004, file: "1998 Volvo V40 CD 2.0 Front.jpg" },
      { gen: "v2", from: 2012, to: 2019, file: "2nd generation Volvo V40 T4 front.jpg" }
    ],
    "volvo|v60": [
      { gen: "y20", from: 2010, to: 2018, file: "2016 Volvo V60 Polestar AWD Automatic Estate 2.0 Front.jpg" },
      { gen: "spa", from: 2018, to: 2026, file: "2018 Volvo V60 Momentum PRO D4 Automatic 2.0 Front.jpg" }
    ],
    "volvo|v90": [
      { gen: "spa", from: 2016, to: 2026, file: "2017 Volvo V90 D4 Automatic 2.0 Front.jpg" }
    ],
    "volvo|xc40": [
      { gen: "cma", from: 2017, to: 2026, file: "2018 Volvo XC40 Momentum PRO D3 AWD 2.0 Front.jpg" }
    ],
    "volvo|xc60": [
      { gen: "i", from: 2008, to: 2017, file: "2016 Volvo XC60 SE Lux NAV D4 Automatic 2.0 Front.jpg" },
      { gen: "ii", from: 2017, to: 2026, file: "2018 Volvo XC60 R-Design D5 P-Pulse 2.0 Front.jpg" }
    ],
    "volvo|xc90": [
      { gen: "p2", from: 2002, to: 2014, file: "2004 Volvo XC90 D5 SE AWD Semi-Automatic 2.4 Front.jpg" },
      { gen: "spa", from: 2014, to: 2026, file: "2016 Volvo XC90, cph.jpg" }
    ]
  };
  /* MODELS:END */

  /* Los vehículos de demostración no guardan marca/modelo/generación. */
  const DEMO_KEYS = {
    golf: "volkswagen|golf|mk7",
    a4: "audi|a4|b9"
  };

  const FILES = {};
  Object.keys(MODELS).forEach(function (model) {
    MODELS[model].forEach(function (entry) {
      FILES[model + "|" + entry.gen] = entry;
    });
  });

  function fold(value) {
    return String(value == null ? "" : value)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function slug(value) {
    return fold(value).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  function vehicleYear(vehicle) {
    const direct = parseInt(vehicle.year, 10);
    if (direct) return direct;
    const match = String(vehicle.generationYears || vehicle.engineYears || "").match(/(19|20)\d{2}/);
    return match ? parseInt(match[0], 10) : 0;
  }

  function genToken(vehicle) {
    if (vehicle.generationCode) return slug(vehicle.generationCode);
    if (!vehicle.generation) return "";
    const modelTokens = slug(vehicle.model).split("-");
    const tokens = fold(vehicle.generation).split(/[^a-z0-9]+/).filter(Boolean);
    const rest = tokens.filter(function (token) { return modelTokens.indexOf(token) === -1; });
    return rest.length ? rest[0] : "";
  }

  function entryFor(vehicle) {
    if (!vehicle) return null;
    const model = slug(vehicle.brand) + "|" + slug(vehicle.model);
    const entries = MODELS[model];
    if (!entries) return null;
    const token = genToken(vehicle);
    if (token) {
      for (let i = 0; i < entries.length; i++) {
        if (entries[i].gen === token) return { model: model, entry: entries[i] };
      }
      // Generación conocida sin foto propia: mejor placeholder que otra generación.
      return null;
    }
    const year = vehicleYear(vehicle);
    if (year) {
      let hit = null;
      entries.forEach(function (entry) {
        if (year >= entry.from && year <= entry.to && (!hit || entry.from > hit.from)) hit = entry;
      });
      return hit ? { model: model, entry: hit } : null;
    }
    return entries.length === 1 ? { model: model, entry: entries[0] } : null;
  }

  function keyFor(vehicle) {
    if (!vehicle) return "";
    if (vehicle.photoKey && FILES[vehicle.photoKey]) return vehicle.photoKey;
    if (DEMO_KEYS[vehicle.id] && FILES[DEMO_KEYS[vehicle.id]]) return DEMO_KEYS[vehicle.id];
    const found = entryFor(vehicle);
    return found ? found.model + "|" + found.entry.gen : "";
  }

  function has(key) {
    return !!FILES[key];
  }

  function text(metaValue) {
    if (!metaValue) return "";
    return String(metaValue.value || "")
      .replace(/<[^>]*>/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#0?39;/g, "'")
      .replace(/\s+/g, " ")
      .trim();
  }

  function isFreeLicense(name) {
    const value = fold(name);
    if (!value) return false;
    if (/(^|[\s-])(nc|nd)($|[\s/])/.test(value)) return false;
    return /^(cc0|cc-zero|public domain|pd|cc by|cc-by)/.test(value);
  }

  function fetchMeta(title) {
    const url = new URL(API);
    url.searchParams.set("action", "query");
    url.searchParams.set("format", "json");
    url.searchParams.set("origin", "*");
    url.searchParams.set("titles", "File:" + title);
    url.searchParams.set("prop", "imageinfo");
    url.searchParams.set("iiprop", "url|extmetadata|size");
    url.searchParams.set("iiurlwidth", String(THUMB_WIDTH));

    return fetch(url.toString(), { credentials: "omit", mode: "cors" })
      .then((response) => {
        if (!response.ok) throw new Error("commons " + response.status);
        return response.json();
      })
      .then((data) => {
        const pages = data && data.query && data.query.pages;
        const page = pages && Object.keys(pages).map((id) => pages[id])[0];
        const info = page && page.imageinfo && page.imageinfo[0];
        if (!info) return null;
        const meta = info.extmetadata || {};
        const license = text(meta.LicenseShortName);
        if (!isFreeLicense(license)) return null;
        return {
          src: info.thumburl || info.url,
          width: info.thumbwidth || info.width,
          height: info.thumbheight || info.height,
          credit: text(meta.Artist) || "Wikimedia Commons",
          license: license,
          licenseUrl: text(meta.LicenseUrl),
          page: info.descriptionurl,
          file: title
        };
      });
  }

  function readCache() {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY)) || {}; } catch (err) { return {}; }
  }

  function writeCache(cache) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch (err) { /* modo privado */ }
  }

  function resolve(key) {
    if (!has(key)) return Promise.resolve(null);
    const cached = readCache()[key];
    if (cached && cached.data && Date.now() - cached.at < CACHE_TTL) {
      return Promise.resolve(cached.data);
    }
    return fetchMeta(FILES[key].file)
      .then((data) => {
        if (!data) return cached && cached.data ? cached.data : null;
        const cache = readCache();
        cache[key] = { at: Date.now(), data: data };
        writeCache(cache);
        return data;
      })
      .catch(() => (cached && cached.data ? cached.data : null));
  }

  window.PitBoxCarImage = {
    keyFor: keyFor,
    has: has,
    resolve: resolve,
    resolveForVehicle: function (vehicle) { return resolve(keyFor(vehicle)); },
    entryFor: entryFor,
    curatedKeys: Object.keys(FILES)
  };
})();
