export const INITIAL_POIS = [
    // === A-1: Madrid - Burgos - País Vasco ===
    {
        id: 1, name: 'Restaurante Landa', description: 'Mítico palacio gótico a pie de autopista, famoso por sus huevos fritos con morcilla.',
        photos: ['https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80'],
        coords: [42.3168, -3.7029], category: 'Castellano', rating: 4.8, address: 'Autovía A-1, Km 235, 09001 Burgos',
        hours: { open: '13:00', close: '23:30' }, services: ['parking', 'wifi', 'ev_charger', 'vegan']
    },
    {
        id: 2, name: 'El Lagar de Isilla', description: 'Restaurante y bodega tradicional espectacular para comer lechazo en ruta.',
        photos: ['https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=800&q=80'],
        coords: [41.6705, -3.6896], category: 'Asador', rating: 4.6, address: 'Autovía A-1, Km 160 (Aranda de Duero)',
        hours: { open: '13:00', close: '23:00' }, services: ['parking', 'pet_friendly']
    },
    {
        id: 3, name: 'Mesón de la Villa', description: 'Cocina arandina auténtica, perfecta para una parada contundente.',
        photos: ['https://images.unsplash.com/photo-1515443961218-a51367888e4b?auto=format&fit=crop&w=800&q=80'],
        coords: [41.6710, -3.6880], category: 'Asador', rating: 4.5, address: 'Plaza Mayor 3, Aranda de Duero (Salida A-1)',
        hours: { open: '13:00', close: '23:30' }, services: ['wifi', 'vegan']
    },
    {
        id: 4, name: 'La Morquecha', description: 'Asador rural de piedra, ideal como primera parada subiendo desde Madrid.',
        photos: ['https://images.unsplash.com/photo-1551632436-cbf8dd35adfa?auto=format&fit=crop&w=800&q=80'],
        coords: [40.9922, -3.6358], category: 'Asador', rating: 4.4, address: 'Autovía A-1, km 74, Buitrago del Lozoya',
        hours: { open: '12:30', close: '22:30' }, services: ['parking', 'terraza', 'pet_friendly']
    },
    {
        id: 5, name: 'El Refugio', description: 'Comida casera alavesa poco antes de llegar a Vitoria.',
        photos: ['https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80'],
        coords: [42.7661, -2.8686], category: 'Casero', rating: 4.3, address: 'Autovía A-1, km 325, La Puebla de Arganzón',
        hours: { open: '12:00', close: '17:00' }, services: ['parking', 'vegan']
    },

    // === A-2: Madrid - Zaragoza - Barcelona ===
    {
        id: 6, name: 'Área 103', description: 'Una institución en la A-2. Abierto 24h, fama de torreznos inigualables y buen menú.',
        photos: ['https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80'],
        coords: [40.9575, -2.6953], category: 'Área de servicio', rating: 4.7, address: 'Autovía A-2, km 103, Almadrones',
        hours: { open: '00:00', close: '23:59' }, services: ['parking', 'wifi', 'ev_charger', 'pet_friendly']
    },
    {
        id: 7, name: 'Mesón El Caserío', description: 'Punto perfecto de descanso en Medinaceli. Torreznos y buenas carnes.',
        photos: ['https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=800&q=80'],
        coords: [41.1717, -2.4334], category: 'Tradicional', rating: 4.4, address: 'Antigua N-II, km 151, Medinaceli',
        hours: { open: '12:00', close: '23:00' }, services: ['parking', 'pet_friendly', 'vegan']
    },
    {
        id: 8, name: 'Restaurante Monegros', description: 'Oasis en el desierto de los Monegros, parada obligatoria de camioneros y familias.',
        photos: ['https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80'],
        coords: [41.4965, -0.1554], category: 'Casero', rating: 4.2, address: 'Autopista AP-2, Área de Servicio Bujaraloz',
        hours: { open: '06:00', close: '00:00' }, services: ['parking', 'pet_friendly']
    },
    {
        id: 9, name: 'El Cachirulo', description: 'Restaurante lujoso y amplio a la entrada de Zaragoza, ideal para celebraciones y viajeros exquisitos.',
        photos: ['https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=800&q=80'],
        coords: [41.6575, -0.9322], category: 'Aragonés', rating: 4.6, address: 'N-232, km 246, 50011 Zaragoza',
        hours: { open: '13:30', close: '16:00' }, services: ['parking', 'terraza', 'vegan']
    },
    {
        id: 10, name: 'Restaurant Can Boix', description: 'Cataluña interior, con menú de brasa y caracoles excelente al lado de la A-2.',
        photos: ['https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?auto=format&fit=crop&w=800&q=80'],
        coords: [41.6375, 0.6122], category: 'Catalán', rating: 4.5, address: 'Autovía A-2, km 460, Lleida',
        hours: { open: '12:30', close: '22:30' }, services: ['parking', 'wifi', 'pet_friendly']
    },
    {
        id: 11, name: 'La Gastronómica del Bruc', description: 'Antes de entrar a Barcelona, una parada de calidad con vistas a Montserrat.',
        photos: ['https://images.unsplash.com/photo-1551218808-94e220e084d2?auto=format&fit=crop&w=800&q=80'],
        coords: [41.5830, 1.7820], category: 'Mediterránea', rating: 4.4, address: 'Autovía A-2, km 570, El Bruc',
        hours: { open: '13:00', close: '22:30' }, services: ['parking', 'terraza', 'vegan']
    },

    // === A-3: Madrid - Valencia ===
    {
        id: 12, name: 'Finca La Estacada', description: 'Complejo enológico y restaurante de autor pegado a la autovía.',
        photos: ['https://images.unsplash.com/photo-1525610553991-2bede1a236e2?auto=format&fit=crop&w=800&q=80'],
        coords: [39.9961, -3.0036], category: 'Gastro', rating: 4.6, address: 'Autovía A-3, km 82, Tarancón',
        hours: { open: '13:00', close: '23:00' }, services: ['parking', 'wifi', 'ev_charger', 'pet_friendly']
    },
    {
        id: 13, name: 'Restaurante Marino', description: 'Mítico de la A-3 en Honrubia. Comida manchega generosa y de calidad.',
        photos: ['https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80'],
        coords: [39.6156, -2.2858], category: 'Manchego', rating: 4.5, address: 'Autovía A-3, km 167, Honrubia',
        hours: { open: '11:00', close: '23:30' }, services: ['parking', 'vegan']
    },
    {
        id: 14, name: 'Venta San José', description: 'Clásico parador de camiones y viajeros buscando buen asado de cordero.',
        photos: ['https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80'],
        coords: [39.7540, -2.4820], category: 'Asador', rating: 4.2, address: 'Autovía A-3, km 124, Zafra de Záncara',
        hours: { open: '08:00', close: '23:00' }, services: ['parking', 'wifi', 'pet_friendly']
    },
    {
        id: 15, name: 'Mesón La Cañada', description: 'Buen arroz y carne en Requena, el descanso perfecto antes de bajar a Valencia.',
        photos: ['https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=800&q=80'],
        coords: [39.4930, -1.1090], category: 'Tradicional', rating: 4.4, address: 'Autovía A-3, km 289, Requena',
        hours: { open: '12:00', close: '23:00' }, services: ['parking', 'vegan']
    },

    // === A-4: Madrid - Andalucía ===
    {
        id: 16, name: 'Venta del Quijote', description: 'Construcción histórica cervantina. Migas y duelo y quebrantos.',
        photos: ['https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&w=800&q=80'],
        coords: [39.3241, -3.4836], category: 'Manchego', rating: 4.6, address: 'Autovía A-4, km 135, Puerto Lápice',
        hours: { open: '09:00', close: '22:00' }, services: ['parking', 'terraza', 'pet_friendly']
    },
    {
        id: 17, name: 'Mesón Despeñaperros', description: 'Legendario, con vistas al paso de Despeñaperros. Pescados y carnes de monte.',
        photos: ['https://images.unsplash.com/photo-1482049016688-2d3e1b311543?auto=format&fit=crop&w=800&q=80'],
        coords: [38.3411, -3.5392], category: 'Andaluz', rating: 4.7, address: 'Autovía A-4, km 257, Santa Elena',
        hours: { open: '12:00', close: '23:00' }, services: ['parking', 'wifi', 'terraza', 'vegan']
    },
    {
        id: 18, name: 'La Perdiz', description: 'Hotel-Restaurante famoso en la ruta sur, especialidad en perdiz escabechada.',
        photos: ['https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=800&q=80'],
        coords: [38.2758, -3.6150], category: 'Caza', rating: 4.5, address: 'Autovía A-4, km 268, La Carolina',
        hours: { open: '13:00', close: '23:00' }, services: ['parking', 'wifi', 'pet_friendly']
    },
    {
        id: 19, name: 'Abades Pedro Abad', description: 'Macro-área de servicio muy cómoda, moderna, y con andalucismos varios.',
        photos: ['https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=800&q=80'],
        coords: [37.9620, -4.4550], category: 'Área de servicio', rating: 4.1, address: 'Autovía A-4, km 360, Pedro Abad',
        hours: { open: '00:00', close: '23:59' }, services: ['parking', 'wifi', 'ev_charger', 'vegan']
    },
    {
        id: 20, name: 'Venta Pinto', description: 'Icono del sur. Bocadillos de lomo en manteca increíbles cerca de Vejer.',
        photos: ['https://images.unsplash.com/photo-1574484284002-952d92456975?auto=format&fit=crop&w=800&q=80'],
        coords: [36.2550, -5.9546], category: 'Venta', rating: 4.8, address: 'N-340 / A-48, km 36, La Barca de Vejer',
        hours: { open: '08:00', close: '23:30' }, services: ['parking', 'terraza', 'pet_friendly']
    },

    // === A-5: Madrid - Extremadura ===
    {
        id: 21, name: 'Restaurante El Gallo', description: 'Clásica parada en Talavera donde comer buen cerdo y caza a precio razonable.',
        photos: ['https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80'],
        coords: [39.9606, -4.8329], category: 'Casero', rating: 4.3, address: 'Autovía A-5, km 118, Talavera de la Reina',
        hours: { open: '12:00', close: '22:00' }, services: ['parking', 'vegan']
    },
    {
        id: 22, name: 'Hostal Restaurante El Hidalgo', description: 'Famoso plato de cochifrito y amplios comedores, muy fácil para salir y entrar de la A-5.',
        photos: ['https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=800&q=80'],
        coords: [39.8911, -5.5413], category: 'Extremeño', rating: 4.4, address: 'Autovía A-5, km 200, Navalmoral de la Mata',
        hours: { open: '07:00', close: '23:00' }, services: ['parking', 'pet_friendly']
    },
    {
        id: 23, name: 'La Alta Campaña', description: 'Entrando en Trujillo, menús extremeños potentes sin desviarse apenas.',
        photos: ['https://images.unsplash.com/photo-1551218808-94e220e084d2?auto=format&fit=crop&w=800&q=80'],
        coords: [39.4670, -5.8750], category: 'Tradicional', rating: 4.5, address: 'Autovía A-5, km 253, Trujillo',
        hours: { open: '12:30', close: '23:00' }, services: ['parking', 'wifi', 'vegan']
    },
    {
        id: 24, name: 'Complejo Roma', description: 'Gran complejo de descanso junto a Mérida con buffet y buena cafetería.',
        photos: ['https://images.unsplash.com/photo-1534080564583-6be75777b70a?auto=format&fit=crop&w=800&q=80'],
        coords: [38.9152, -6.3444], category: 'Área de servicio', rating: 4.2, address: 'Autovía A-5, km 340, Mérida',
        hours: { open: '00:00', close: '23:59' }, services: ['parking', 'pet_friendly', 'pet_friendly']
    },

    // === A-6: Madrid - Galicia ===
    {
        id: 25, name: 'Alto del León', description: 'Asador en pleno puerto de montaña. Chuletones y vistas hacia Madrid y Segovia.',
        photos: ['https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=800&q=80'],
        coords: [40.7099, -4.1481], category: 'Asador', rating: 4.7, address: 'N-VI / A-6, km 56, Alto de Guadarrama',
        hours: { open: '13:00', close: '23:00' }, services: ['parking', 'terraza', 'vegan']
    },
    {
        id: 26, name: 'Asador Las Cubas', description: 'El tostón (cochinillo) de Arévalo en un ambiente inmejorable.',
        photos: ['https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80'],
        coords: [41.0263, -4.7171], category: 'Asador', rating: 4.6, address: 'Autovía A-6, Salida 124, Arévalo',
        hours: { open: '13:00', close: '16:00' }, services: ['parking', 'pet_friendly']
    },
    {
        id: 27, name: 'El Ermitaño', description: 'Gastronomía de 1 estrella Michelin sin salir casi de la vía. Un lujo.',
        photos: ['https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=800&q=80'],
        coords: [42.0006, -5.6766], category: 'Gastro', rating: 4.9, address: 'Autovía A-6, km 260, Benavente',
        hours: { open: '13:30', close: '23:00' }, services: ['parking', 'wifi', 'vegan']
    },
    {
        id: 28, name: 'Restaurante El Pescador', description: 'El pulpo y el pescado más fresco traído de Galicia al Bierzo.',
        photos: ['https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=800&q=80'],
        coords: [42.6178, -6.4168], category: 'Marisco', rating: 4.5, address: 'Autovía A-6, km 370, Bembibre',
        hours: { open: '13:00', close: '23:30' }, services: ['parking', 'pet_friendly']
    },
    {
        id: 29, name: 'Hostal La Palloza', description: 'Caldo gallego y empanada coronando el puerto de Pedrafita.',
        photos: ['https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80'],
        coords: [42.7275, -7.0253], category: 'Gallego', rating: 4.4, address: 'Autovía A-6, km 430, Pedrafita do Cebreiro',
        hours: { open: '08:00', close: '00:00' }, services: ['parking', 'vegan']
    },
    {
        id: 30, name: 'La Hacienda', description: 'Especialidades maragatas en ruta, excelente cocido en La Bañeza.',
        photos: ['https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80'],
        coords: [42.3020, -5.8940], category: 'Tradicional', rating: 4.3, address: 'Autovía A-6, km 300, La Bañeza',
        hours: { open: '12:00', close: '23:00' }, services: ['parking', 'wifi', 'pet_friendly']
    },

    // === A-66: Ruta de la Plata (Gijón - Sevilla) ===
    {
        id: 31, name: 'El Molino', description: 'En las faldas de Pajares. Fabada impresionante para entrar o salir de Asturias.',
        photos: ['https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80'],
        coords: [43.1558, -5.8291], category: 'Asturiano', rating: 4.7, address: 'Autovía A-66, km 59, Pola de Lena',
        hours: { open: '13:00', close: '16:30' }, services: ['parking', 'wifi', 'vegan']
    },
    {
        id: 32, name: 'Restaurante Valle del Huerna', description: 'Chigre pegado a la autopista, chuletón y sidra en buena dosis.',
        photos: ['https://images.unsplash.com/photo-1551632436-cbf8dd35adfa?auto=format&fit=crop&w=800&q=80'],
        coords: [43.0550, -5.8350], category: 'Casero', rating: 4.4, address: 'Autopista AP-66, Campomanes',
        hours: { open: '12:00', close: '22:30' }, services: ['parking', 'pet_friendly']
    },
    {
        id: 33, name: 'Cuatro Calzadas', description: 'Buen embutido ibérico y carnes, con amplio parking pasado Salamanca.',
        photos: ['https://images.unsplash.com/photo-1482049016688-2d3e1b311543?auto=format&fit=crop&w=800&q=80'],
        coords: [40.7589, -5.6264], category: 'Castellano', rating: 4.5, address: 'Autovía A-66, km 348, Buenavista',
        hours: { open: '08:00', close: '23:00' }, services: ['parking', 'terraza', 'vegan']
    },
    {
        id: 34, name: 'Restaurante Roma Baños', description: 'Cordero asado y menú espectacular en el límite Cáceres-Salamanca.',
        photos: ['https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80'],
        coords: [40.3200, -5.8600], category: 'Asador', rating: 4.3, address: 'Autovía A-66, km 427, Baños de Montemayor',
        hours: { open: '13:00', close: '16:00' }, services: ['parking', 'pet_friendly']
    },
    {
        id: 35, name: 'Complejo Leo', description: 'El reino del ibérico y el descanso 5 estrellas de la A-66. Bocadillos eternos.',
        photos: ['https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&w=800&q=80'],
        coords: [38.0875, -6.2625], category: 'Área de servicio', rating: 4.6, address: 'Autovía A-66, km 730, Monesterio',
        hours: { open: '00:00', close: '23:59' }, services: ['parking', 'wifi', 'ev_charger', 'vegan']
    },

    // === AP-7 / A-7: Corredor Mediterráneo ===
    {
        id: 36, name: 'Gran Jonquera Buffet', description: 'Macro complejo comercial y buffet libre transfronterizo en la entrada de España.',
        photos: ['https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=800&q=80'],
        coords: [42.4080, 2.8750], category: 'Mediterránea', rating: 4.0, address: 'Autopista AP-7, km 0, La Jonquera',
        hours: { open: '12:00', close: '23:00' }, services: ['parking', 'wifi', 'ev_charger', 'pet_friendly']
    },
    {
        id: 37, name: 'Restaurante El Paso', description: 'Alta calidad de marisco y arroces a pocos minutos del peaje de L\'Ametlla.',
        photos: ['https://images.unsplash.com/photo-1534080564583-6be75777b70a?auto=format&fit=crop&w=800&q=80'],
        coords: [40.8840, 0.8030], category: 'Marisco', rating: 4.5, address: 'Autopista AP-7, salida 39, L\'Ametlla de Mar',
        hours: { open: '13:00', close: '16:30' }, services: ['parking', 'vegan']
    },
    {
        id: 38, name: 'Restaurante Nou Racó', description: 'En plena Albufera, paellas a la leña desviándose muy poco de la autovía.',
        photos: ['https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=800&q=80'],
        coords: [39.3331, -0.3204], category: 'Arrocería', rating: 4.7, address: 'El Palmar, Valencia (Cerca V-31/AP-7)',
        hours: { open: '13:30', close: '16:30' }, services: ['parking', 'terraza', 'pet_friendly']
    },
    {
        id: 39, name: 'Venta El Perull', description: 'Lugar tradicional alicantino, brasa de leña y tapas.',
        photos: ['https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=800&q=80'],
        coords: [38.8250, -0.0150], category: 'Tradicional', rating: 4.3, address: 'N-332 / AP-7, Ondara',
        hours: { open: '08:00', close: '00:00' }, services: ['parking', 'vegan']
    },
    {
        id: 40, name: 'Venta del Pobre', description: 'El oasis gastronómico del levante almeriense, asados y platos de cuchara.',
        photos: ['https://images.unsplash.com/photo-1574484284002-952d92456975?auto=format&fit=crop&w=800&q=80'],
        coords: [36.8825, -2.1278], category: 'Venta', rating: 4.6, address: 'Autovía A-7, Salida Venta del Pobre (Níjar)',
        hours: { open: '06:00', close: '23:30' }, services: ['parking', 'terraza', 'pet_friendly']
    },
    {
        id: 41, name: 'Restaurante El Higuerón', description: 'Pescados y brasa con vistas increíbles del Mediterráneo sobre la A-7.',
        photos: ['https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=800&q=80'],
        coords: [36.5815, -4.5936], category: 'Mediterránea', rating: 4.8, address: 'Autovía A-7, Salida 217, Fuengirola',
        hours: { open: '13:00', close: '00:00' }, services: ['parking', 'wifi', 'terraza', 'vegan']
    },
    {
        id: 42, name: 'Área La Paz', description: 'Punto de recarga y descanso masivo cerca de Murcia con un gran buffet.',
        photos: ['https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80'],
        coords: [37.8930, -1.2450], category: 'Área de servicio', rating: 4.1, address: 'Autovía A-7, km 590, Sangonera la Seca',
        hours: { open: '00:00', close: '23:59' }, services: ['parking', 'ev_charger', 'pet_friendly']
    },

    // === A-8: Corredor Cantábrico (Galicia - Euskadi) ===
    {
        id: 43, name: 'Casa Poli', description: 'Antigua casona indiana donde comer buena fabada y sidra cerca de Llanes.',
        photos: ['https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80'],
        coords: [43.3934, -4.6653], category: 'Asturiano', rating: 4.7, address: 'Autovía A-8, Salida Vidiago',
        hours: { open: '13:00', close: '23:00' }, services: ['parking', 'terraza', 'vegan']
    },
    {
        id: 44, name: 'La Capitana', description: 'Excelente pescado a la parrilla y rabas en la bahía de Laredo.',
        photos: ['https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=800&q=80'],
        coords: [43.4116, -3.4172], category: 'Marisco', rating: 4.5, address: 'A-8 Salida Laredo, P.º Marítimo',
        hours: { open: '13:00', close: '23:30' }, services: ['parking', 'wifi', 'pet_friendly']
    },
    {
        id: 45, name: 'El Ancla', description: 'Magníficos pescados y arroces con vistas al Sella. Desvío en Ribadesella.',
        photos: ['https://images.unsplash.com/photo-1515443961218-a51367888e4b?auto=format&fit=crop&w=800&q=80'],
        coords: [43.4650, -5.0600], category: 'Marisco', rating: 4.6, address: 'A-8 Salida Ribadesella',
        hours: { open: '13:00', close: '23:00' }, services: ['parking', 'terraza', 'vegan']
    },
    {
        id: 46, name: 'Restaurante Castro', description: 'Uno de los grandes de la zona occidente en plena Nacional/A-8, especialidad cachopo.',
        photos: ['https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80'],
        coords: [43.5350, -6.5380], category: 'Asturiano', rating: 4.4, address: 'N-634 / A-8, km 500, Luarca',
        hours: { open: '13:00', close: '23:30' }, services: ['parking', 'pet_friendly']
    },
    {
        id: 47, name: 'San Román de Escalante', description: 'Casona montañesa espectacular con cocina refinada, a solo unos kms de la A-8.',
        photos: ['https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=800&q=80'],
        coords: [43.4350, -3.5180], category: 'Gastro', rating: 4.6, address: 'Barrio San Román s/n, Escalante (Cantabria)',
        hours: { open: '13:30', close: '23:00' }, services: ['parking', 'wifi', 'ev_charger', 'vegan']
    },
    {
        id: 48, name: 'Zarate', description: 'Alta gastronomía vizcaína con una estrella, perfecto en el paso por Bilbao.',
        photos: ['https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80'],
        coords: [43.2660, -2.9460], category: 'Gastro', rating: 4.8, address: 'Licenciado Poza Kalea 65, Bilbao',
        hours: { open: '13:30', close: '22:30' }, services: ['wifi', 'pet_friendly']
    },
    {
        id: 49, name: 'Sagardotegi Zapiain', description: 'Auténtica sidrería vasca con chuletón en ruta cerquísima de la AP-8.',
        photos: ['https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=800&q=80'],
        coords: [43.2750, -1.9540], category: 'Asador', rating: 4.7, address: 'Kale Nagusia 96, Astigarraga (Gipuzkoa)',
        hours: { open: '13:00', close: '22:30' }, services: ['parking', 'vegan']
    },

    // === Rutas Interiores Varios ===
    {
        id: 50, name: 'Mesón Puerta Grande', description: 'Parada taurina y clásica de carne asada cruzando La Mancha hacia Alicante (A-31).',
        photos: ['https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=800&q=80'],
        coords: [38.9950, -1.8600], category: 'Castellano', rating: 4.3, address: 'Autovía A-31, Albacete',
        hours: { open: '12:00', close: '00:00' }, services: ['parking', 'pet_friendly']
    }
];
