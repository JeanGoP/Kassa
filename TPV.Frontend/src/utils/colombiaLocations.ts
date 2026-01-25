export interface Department {
    id: string; // Code
    name: string;
}

export interface City {
    id: string; // Code
    departmentId: string;
    name: string;
}

export const departments: Department[] = [
    { id: "05", name: "ANTIOQUIA" },
    { id: "08", name: "ATLÁNTICO" },
    { id: "11", name: "BOGOTÁ, D.C." },
    { id: "13", name: "BOLÍVAR" },
    { id: "15", name: "BOYACÁ" },
    { id: "17", name: "CALDAS" },
    { id: "18", name: "CAQUETÁ" },
    { id: "19", name: "CAUCA" },
    { id: "20", name: "CESAR" },
    { id: "23", name: "CÓRDOBA" },
    { id: "25", name: "CUNDINAMARCA" },
    { id: "27", name: "CHOCÓ" },
    { id: "41", name: "HUILA" },
    { id: "44", name: "LA GUAJIRA" },
    { id: "47", name: "MAGDALENA" },
    { id: "50", name: "META" },
    { id: "52", name: "NARIÑO" },
    { id: "54", name: "NORTE DE SANTANDER" },
    { id: "63", name: "QUINDIO" },
    { id: "66", name: "RISARALDA" },
    { id: "68", name: "SANTANDER" },
    { id: "70", name: "SUCRE" },
    { id: "73", name: "TOLIMA" },
    { id: "76", name: "VALLE DEL CAUCA" },
    { id: "81", name: "ARAUCA" },
    { id: "85", name: "CASANARE" },
    { id: "86", name: "PUTUMAYO" },
    { id: "88", name: "ARCHIPIÉLAGO DE SAN ANDRÉS, PROVIDENCIA Y SANTA CATALINA" },
    { id: "91", name: "AMAZONAS" },
    { id: "94", name: "GUAINÍA" },
    { id: "95", name: "GUAVIARE" },
    { id: "97", name: "VAUPÉS" },
    { id: "99", name: "VICHADA" }
];

export const cities: City[] = [
    // ANTIOQUIA
    { id: "05001", departmentId: "05", name: "MEDELLÍN" },
    { id: "05002", departmentId: "05", name: "ABEJORRAL" },
    { id: "05088", departmentId: "05", name: "BELLO" },
    { id: "05266", departmentId: "05", name: "ENVIGADO" },
    { id: "05360", departmentId: "05", name: "ITAGÜÍ" },
    { id: "05615", departmentId: "05", name: "RIONEGRO" },
    
    // ATLÁNTICO
    { id: "08001", departmentId: "08", name: "BARRANQUILLA" },
    { id: "08758", departmentId: "08", name: "SOLEDAD" },
    { id: "08573", departmentId: "08", name: "PUERTO COLOMBIA" },

    // BOGOTÁ
    { id: "11001", departmentId: "11", name: "BOGOTÁ, D.C." },

    // BOLÍVAR
    { id: "13001", departmentId: "13", name: "CARTAGENA DE INDIAS" },
    { id: "13430", departmentId: "13", name: "MAGANGUÉ" },

    // BOYACÁ
    { id: "15001", departmentId: "15", name: "TUNJA" },
    { id: "15238", departmentId: "15", name: "DUITAMA" },
    { id: "15759", departmentId: "15", name: "SOGAMOSO" },

    // CALDAS
    { id: "17001", departmentId: "17", name: "MANIZALES" },

    // CAQUETÁ
    { id: "18001", departmentId: "18", name: "FLORENCIA" },

    // CAUCA
    { id: "19001", departmentId: "19", name: "POPAYÁN" },

    // CESAR
    { id: "20001", departmentId: "20", name: "VALLEDUPAR" },

    // CÓRDOBA
    { id: "23001", departmentId: "23", name: "MONTERÍA" },

    // CUNDINAMARCA
    { id: "25001", departmentId: "25", name: "AGUA DE DIOS" },
    { id: "25175", departmentId: "25", name: "CHÍA" },
    { id: "25269", departmentId: "25", name: "FACATATIVÁ" },
    { id: "25286", departmentId: "25", name: "FUNZA" },
    { id: "25290", departmentId: "25", name: "FUSAGASUGÁ" },
    { id: "25307", departmentId: "25", name: "GIRARDOT" },
    { id: "25473", departmentId: "25", name: "MOSQUERA" },
    { id: "25754", departmentId: "25", name: "SOACHA" },
    { id: "25899", departmentId: "25", name: "ZIPAQUIRÁ" },

    // CHOCÓ
    { id: "27001", departmentId: "27", name: "QUIBDÓ" },

    // HUILA
    { id: "41001", departmentId: "41", name: "NEIVA" },

    // LA GUAJIRA
    { id: "44001", departmentId: "44", name: "RIOHACHA" },
    { id: "44430", departmentId: "44", name: "MAICAO" },

    // MAGDALENA
    { id: "47001", departmentId: "47", name: "SANTA MARTA" },

    // META
    { id: "50001", departmentId: "50", name: "VILLAVICENCIO" },

    // NARIÑO
    { id: "52001", departmentId: "52", name: "PASTO" },
    { id: "52356", departmentId: "52", name: "IPIALES" },
    { id: "52835", departmentId: "52", name: "TUMACO" },

    // NORTE DE SANTANDER
    { id: "54001", departmentId: "54", name: "CÚCUTA" },
    { id: "54498", departmentId: "54", name: "OCAÑA" },
    { id: "54518", departmentId: "54", name: "PAMPLONA" },

    // QUINDIO
    { id: "63001", departmentId: "63", name: "ARMENIA" },

    // RISARALDA
    { id: "66001", departmentId: "66", name: "PEREIRA" },
    { id: "66170", departmentId: "66", name: "DOSQUEBRADAS" },

    // SANTANDER
    { id: "68001", departmentId: "68", name: "BUCARAMANGA" },
    { id: "68081", departmentId: "68", name: "BARRANCABERMEJA" },
    { id: "68276", departmentId: "68", name: "FLORIDABLANCA" },
    { id: "68307", departmentId: "68", name: "GIRÓN" },
    { id: "68547", departmentId: "68", name: "PIEDECUESTA" },
    { id: "68679", departmentId: "68", name: "SAN GIL" },

    // SUCRE
    { id: "70001", departmentId: "70", name: "SINCELEJO" },

    // TOLIMA
    { id: "73001", departmentId: "73", name: "IBAGUÉ" },

    // VALLE DEL CAUCA
    { id: "76001", departmentId: "76", name: "CALI" },
    { id: "76109", departmentId: "76", name: "BUENAVENTURA" },
    { id: "76111", departmentId: "76", name: "BUGA" },
    { id: "76147", departmentId: "76", name: "CARTAGO" },
    { id: "76520", departmentId: "76", name: "PALMIRA" },
    { id: "76834", departmentId: "76", name: "TULUÁ" },
    { id: "76892", departmentId: "76", name: "YUMBO" },

    // ARAUCA
    { id: "81001", departmentId: "81", name: "ARAUCA" },

    // CASANARE
    { id: "85001", departmentId: "85", name: "YOPAL" },

    // PUTUMAYO
    { id: "86001", departmentId: "86", name: "MOCOA" },

    // SAN ANDRÉS
    { id: "88001", departmentId: "88", name: "SAN ANDRÉS" },

    // AMAZONAS
    { id: "91001", departmentId: "91", name: "LETICIA" },

    // GUAINÍA
    { id: "94001", departmentId: "94", name: "INÍRIDA" },

    // GUAVIARE
    { id: "95001", departmentId: "95", name: "SAN JOSÉ DEL GUAVIARE" },

    // VAUPÉS
    { id: "97001", departmentId: "97", name: "MITÚ" },

    // VICHADA
    { id: "99001", departmentId: "99", name: "PUERTO CARREÑO" }
];
