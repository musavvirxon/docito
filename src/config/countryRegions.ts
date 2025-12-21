// Comprehensive country and regions/states data

export interface CountryRegion {
  code: string;
  name: string;
  regions: string[];
}

export const countryRegions: CountryRegion[] = [
  {
    code: "US",
    name: "United States",
    regions: [
      "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
      "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
      "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan",
      "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
      "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
      "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
      "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia",
      "Wisconsin", "Wyoming", "District of Columbia"
    ]
  },
  {
    code: "GB",
    name: "United Kingdom",
    regions: [
      "England", "Scotland", "Wales", "Northern Ireland",
      // English regions
      "Greater London", "South East", "South West", "West Midlands", "North West",
      "North East", "Yorkshire and the Humber", "East Midlands", "East of England"
    ]
  },
  {
    code: "CA",
    name: "Canada",
    regions: [
      "Alberta", "British Columbia", "Manitoba", "New Brunswick", "Newfoundland and Labrador",
      "Northwest Territories", "Nova Scotia", "Nunavut", "Ontario", "Prince Edward Island",
      "Quebec", "Saskatchewan", "Yukon"
    ]
  },
  {
    code: "AU",
    name: "Australia",
    regions: [
      "Australian Capital Territory", "New South Wales", "Northern Territory", "Queensland",
      "South Australia", "Tasmania", "Victoria", "Western Australia"
    ]
  },
  {
    code: "DE",
    name: "Germany",
    regions: [
      "Baden-Württemberg", "Bavaria", "Berlin", "Brandenburg", "Bremen", "Hamburg",
      "Hesse", "Lower Saxony", "Mecklenburg-Vorpommern", "North Rhine-Westphalia",
      "Rhineland-Palatinate", "Saarland", "Saxony", "Saxony-Anhalt", "Schleswig-Holstein", "Thuringia"
    ]
  },
  {
    code: "FR",
    name: "France",
    regions: [
      "Auvergne-Rhône-Alpes", "Bourgogne-Franche-Comté", "Brittany", "Centre-Val de Loire",
      "Corsica", "Grand Est", "Hauts-de-France", "Île-de-France", "Normandy",
      "Nouvelle-Aquitaine", "Occitanie", "Pays de la Loire", "Provence-Alpes-Côte d'Azur"
    ]
  },
  {
    code: "IT",
    name: "Italy",
    regions: [
      "Abruzzo", "Aosta Valley", "Apulia", "Basilicata", "Calabria", "Campania",
      "Emilia-Romagna", "Friuli Venezia Giulia", "Lazio", "Liguria", "Lombardy",
      "Marche", "Molise", "Piedmont", "Sardinia", "Sicily", "Trentino-Alto Adige",
      "Tuscany", "Umbria", "Veneto"
    ]
  },
  {
    code: "ES",
    name: "Spain",
    regions: [
      "Andalusia", "Aragon", "Asturias", "Balearic Islands", "Basque Country",
      "Canary Islands", "Cantabria", "Castile and León", "Castile-La Mancha",
      "Catalonia", "Ceuta", "Extremadura", "Galicia", "La Rioja", "Madrid",
      "Melilla", "Murcia", "Navarre", "Valencian Community"
    ]
  },
  {
    code: "NL",
    name: "Netherlands",
    regions: [
      "Drenthe", "Flevoland", "Friesland", "Gelderland", "Groningen", "Limburg",
      "North Brabant", "North Holland", "Overijssel", "South Holland", "Utrecht", "Zeeland"
    ]
  },
  {
    code: "BE",
    name: "Belgium",
    regions: [
      "Brussels-Capital Region", "Flemish Region", "Walloon Region",
      "Antwerp", "East Flanders", "Flemish Brabant", "Hainaut", "Liège",
      "Limburg", "Luxembourg", "Namur", "Walloon Brabant", "West Flanders"
    ]
  },
  {
    code: "CH",
    name: "Switzerland",
    regions: [
      "Aargau", "Appenzell Ausserrhoden", "Appenzell Innerrhoden", "Basel-Landschaft",
      "Basel-Stadt", "Bern", "Fribourg", "Geneva", "Glarus", "Graubünden", "Jura",
      "Lucerne", "Neuchâtel", "Nidwalden", "Obwalden", "Schaffhausen", "Schwyz",
      "Solothurn", "St. Gallen", "Thurgau", "Ticino", "Uri", "Valais", "Vaud",
      "Zug", "Zürich"
    ]
  },
  {
    code: "AT",
    name: "Austria",
    regions: [
      "Burgenland", "Carinthia", "Lower Austria", "Salzburg", "Styria",
      "Tyrol", "Upper Austria", "Vienna", "Vorarlberg"
    ]
  },
  {
    code: "PL",
    name: "Poland",
    regions: [
      "Greater Poland", "Kuyavian-Pomeranian", "Lesser Poland", "Łódź", "Lower Silesian",
      "Lublin", "Lubusz", "Masovian", "Opole", "Podkarpackie", "Podlaskie", "Pomeranian",
      "Silesian", "Świętokrzyskie", "Warmian-Masurian", "West Pomeranian"
    ]
  },
  {
    code: "CZ",
    name: "Czech Republic",
    regions: [
      "Prague", "Central Bohemian", "South Bohemian", "Plzeň", "Karlovy Vary",
      "Ústí nad Labem", "Liberec", "Hradec Králové", "Pardubice", "Vysočina",
      "South Moravian", "Olomouc", "Zlín", "Moravian-Silesian"
    ]
  },
  {
    code: "SE",
    name: "Sweden",
    regions: [
      "Blekinge", "Dalarna", "Gävleborg", "Gotland", "Halland", "Jämtland",
      "Jönköping", "Kalmar", "Kronoberg", "Norrbotten", "Örebro", "Östergötland",
      "Skåne", "Södermanland", "Stockholm", "Uppsala", "Värmland", "Västerbotten",
      "Västernorrland", "Västmanland", "Västra Götaland"
    ]
  },
  {
    code: "NO",
    name: "Norway",
    regions: [
      "Agder", "Innlandet", "Møre og Romsdal", "Nordland", "Oslo", "Rogaland",
      "Troms og Finnmark", "Trøndelag", "Vestfold og Telemark", "Vestland", "Viken"
    ]
  },
  {
    code: "DK",
    name: "Denmark",
    regions: [
      "Capital Region", "Central Denmark", "North Denmark", "Region Zealand", "Southern Denmark"
    ]
  },
  {
    code: "FI",
    name: "Finland",
    regions: [
      "Åland", "Central Finland", "Central Ostrobothnia", "Kainuu", "Kanta-Häme",
      "Kymenlaakso", "Lapland", "North Karelia", "North Ostrobothnia", "North Savo",
      "Ostrobothnia", "Päijät-Häme", "Pirkanmaa", "Satakunta", "South Karelia",
      "South Ostrobothnia", "South Savo", "Southwest Finland", "Uusimaa"
    ]
  },
  {
    code: "PT",
    name: "Portugal",
    regions: [
      "Azores", "Alentejo", "Algarve", "Centro", "Lisbon", "Madeira", "Norte"
    ]
  },
  {
    code: "GR",
    name: "Greece",
    regions: [
      "Attica", "Central Greece", "Central Macedonia", "Crete", "Eastern Macedonia and Thrace",
      "Epirus", "Ionian Islands", "North Aegean", "Peloponnese", "South Aegean",
      "Thessaly", "Western Greece", "Western Macedonia"
    ]
  },
  {
    code: "IE",
    name: "Ireland",
    regions: [
      "Connacht", "Leinster", "Munster", "Ulster",
      "Carlow", "Cavan", "Clare", "Cork", "Donegal", "Dublin", "Galway",
      "Kerry", "Kildare", "Kilkenny", "Laois", "Leitrim", "Limerick", "Longford",
      "Louth", "Mayo", "Meath", "Monaghan", "Offaly", "Roscommon", "Sligo",
      "Tipperary", "Waterford", "Westmeath", "Wexford", "Wicklow"
    ]
  },
  {
    code: "RU",
    name: "Russia",
    regions: [
      "Moscow", "Saint Petersburg", "Moscow Oblast", "Krasnodar Krai", "Sverdlovsk Oblast",
      "Rostov Oblast", "Republic of Tatarstan", "Republic of Bashkortostan", "Chelyabinsk Oblast",
      "Nizhny Novgorod Oblast", "Samara Oblast", "Novosibirsk Oblast", "Krasnoyarsk Krai",
      "Perm Krai", "Volgograd Oblast", "Voronezh Oblast", "Saratov Oblast", "Tyumen Oblast"
    ]
  },
  {
    code: "UA",
    name: "Ukraine",
    regions: [
      "Kyiv", "Kharkiv", "Odessa", "Dnipro", "Donetsk", "Zaporizhzhia", "Lviv",
      "Kryvyi Rih", "Mykolaiv", "Mariupol", "Luhansk", "Vinnytsia", "Simferopol",
      "Kherson", "Poltava", "Chernihiv", "Cherkasy", "Sumy", "Zhytomyr"
    ]
  },
  {
    code: "TR",
    name: "Turkey",
    regions: [
      "Adana", "Ankara", "Antalya", "Bursa", "Gaziantep", "Istanbul", "Izmir",
      "Kayseri", "Konya", "Mersin", "Samsun", "Trabzon", "Diyarbakır", "Erzurum",
      "Eskişehir", "Kocaeli", "Manisa", "Sakarya", "Şanlıurfa", "Van"
    ]
  },
  {
    code: "AE",
    name: "United Arab Emirates",
    regions: [
      "Abu Dhabi", "Ajman", "Dubai", "Fujairah", "Ras Al Khaimah", "Sharjah", "Umm Al Quwain"
    ]
  },
  {
    code: "SA",
    name: "Saudi Arabia",
    regions: [
      "Asir", "Bahah", "Eastern Province", "Ha'il", "Jazan", "Makkah", "Madinah",
      "Najran", "Northern Borders", "Qassim", "Riyadh", "Tabuk", "Jawf"
    ]
  },
  {
    code: "EG",
    name: "Egypt",
    regions: [
      "Alexandria", "Aswan", "Asyut", "Beheira", "Beni Suef", "Cairo", "Dakahlia",
      "Damietta", "Faiyum", "Gharbia", "Giza", "Ismailia", "Kafr el-Sheikh",
      "Luxor", "Matruh", "Minya", "Monufia", "New Valley", "North Sinai", "Port Said",
      "Qalyubia", "Qena", "Red Sea", "Sharqia", "Sohag", "South Sinai", "Suez"
    ]
  },
  {
    code: "ZA",
    name: "South Africa",
    regions: [
      "Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal", "Limpopo",
      "Mpumalanga", "North West", "Northern Cape", "Western Cape"
    ]
  },
  {
    code: "NG",
    name: "Nigeria",
    regions: [
      "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue",
      "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu",
      "Federal Capital Territory", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano",
      "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun",
      "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"
    ]
  },
  {
    code: "KE",
    name: "Kenya",
    regions: [
      "Baringo", "Bomet", "Bungoma", "Busia", "Elgeyo-Marakwet", "Embu", "Garissa",
      "Homa Bay", "Isiolo", "Kajiado", "Kakamega", "Kericho", "Kiambu", "Kilifi",
      "Kirinyaga", "Kisii", "Kisumu", "Kitui", "Kwale", "Laikipia", "Lamu", "Machakos",
      "Makueni", "Mandera", "Marsabit", "Meru", "Migori", "Mombasa", "Murang'a",
      "Nairobi", "Nakuru", "Nandi", "Narok", "Nyamira", "Nyandarua", "Nyeri",
      "Samburu", "Siaya", "Taita-Taveta", "Tana River", "Tharaka-Nithi", "Trans-Nzoia",
      "Turkana", "Uasin Gishu", "Vihiga", "Wajir", "West Pokot"
    ]
  },
  {
    code: "IN",
    name: "India",
    regions: [
      "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
      "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
      "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
      "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
      "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
      "Delhi", "Chandigarh", "Puducherry", "Jammu and Kashmir", "Ladakh"
    ]
  },
  {
    code: "PK",
    name: "Pakistan",
    regions: [
      "Azad Kashmir", "Balochistan", "Gilgit-Baltistan", "Islamabad Capital Territory",
      "Khyber Pakhtunkhwa", "Punjab", "Sindh"
    ]
  },
  {
    code: "BD",
    name: "Bangladesh",
    regions: [
      "Barisal", "Chittagong", "Dhaka", "Khulna", "Mymensingh", "Rajshahi", "Rangpur", "Sylhet"
    ]
  },
  {
    code: "CN",
    name: "China",
    regions: [
      "Anhui", "Beijing", "Chongqing", "Fujian", "Gansu", "Guangdong", "Guangxi",
      "Guizhou", "Hainan", "Hebei", "Heilongjiang", "Henan", "Hong Kong", "Hubei",
      "Hunan", "Inner Mongolia", "Jiangsu", "Jiangxi", "Jilin", "Liaoning", "Macau",
      "Ningxia", "Qinghai", "Shaanxi", "Shandong", "Shanghai", "Shanxi", "Sichuan",
      "Taiwan", "Tianjin", "Tibet", "Xinjiang", "Yunnan", "Zhejiang"
    ]
  },
  {
    code: "JP",
    name: "Japan",
    regions: [
      "Aichi", "Akita", "Aomori", "Chiba", "Ehime", "Fukui", "Fukuoka", "Fukushima",
      "Gifu", "Gunma", "Hiroshima", "Hokkaido", "Hyogo", "Ibaraki", "Ishikawa",
      "Iwate", "Kagawa", "Kagoshima", "Kanagawa", "Kochi", "Kumamoto", "Kyoto",
      "Mie", "Miyagi", "Miyazaki", "Nagano", "Nagasaki", "Nara", "Niigata", "Oita",
      "Okayama", "Okinawa", "Osaka", "Saga", "Saitama", "Shiga", "Shimane",
      "Shizuoka", "Tochigi", "Tokushima", "Tokyo", "Tottori", "Toyama", "Wakayama",
      "Yamagata", "Yamaguchi", "Yamanashi"
    ]
  },
  {
    code: "KR",
    name: "South Korea",
    regions: [
      "Busan", "Chungcheongbuk-do", "Chungcheongnam-do", "Daegu", "Daejeon",
      "Gangwon-do", "Gwangju", "Gyeonggi-do", "Gyeongsangbuk-do", "Gyeongsangnam-do",
      "Incheon", "Jeju", "Jeollabuk-do", "Jeollanam-do", "Sejong", "Seoul", "Ulsan"
    ]
  },
  {
    code: "TH",
    name: "Thailand",
    regions: [
      "Bangkok", "Central Thailand", "Eastern Thailand", "Northern Thailand",
      "Northeastern Thailand", "Southern Thailand", "Western Thailand",
      "Chiang Mai", "Chonburi", "Nakhon Ratchasima", "Khon Kaen", "Udon Thani",
      "Phuket", "Surat Thani", "Nonthaburi", "Pathum Thani", "Samut Prakan"
    ]
  },
  {
    code: "VN",
    name: "Vietnam",
    regions: [
      "An Giang", "Ba Ria-Vung Tau", "Bac Giang", "Bac Kan", "Bac Lieu", "Bac Ninh",
      "Ben Tre", "Binh Dinh", "Binh Duong", "Binh Phuoc", "Binh Thuan", "Ca Mau",
      "Can Tho", "Cao Bang", "Da Nang", "Dak Lak", "Dak Nong", "Dien Bien",
      "Dong Nai", "Dong Thap", "Gia Lai", "Ha Giang", "Ha Nam", "Ha Noi", "Ha Tinh",
      "Hai Duong", "Hai Phong", "Hau Giang", "Ho Chi Minh City", "Hoa Binh"
    ]
  },
  {
    code: "MY",
    name: "Malaysia",
    regions: [
      "Johor", "Kedah", "Kelantan", "Kuala Lumpur", "Labuan", "Malacca", "Negeri Sembilan",
      "Pahang", "Penang", "Perak", "Perlis", "Putrajaya", "Sabah", "Sarawak",
      "Selangor", "Terengganu"
    ]
  },
  {
    code: "SG",
    name: "Singapore",
    regions: [
      "Central Region", "East Region", "North Region", "North-East Region", "West Region"
    ]
  },
  {
    code: "ID",
    name: "Indonesia",
    regions: [
      "Aceh", "Bali", "Banten", "Bengkulu", "Central Java", "Central Kalimantan",
      "Central Sulawesi", "East Java", "East Kalimantan", "East Nusa Tenggara",
      "Gorontalo", "Jakarta", "Jambi", "Lampung", "Maluku", "North Kalimantan",
      "North Maluku", "North Sulawesi", "North Sumatra", "Papua", "Riau",
      "Riau Islands", "South Kalimantan", "South Sulawesi", "South Sumatra",
      "Southeast Sulawesi", "West Java", "West Kalimantan", "West Nusa Tenggara",
      "West Papua", "West Sulawesi", "West Sumatra", "Yogyakarta"
    ]
  },
  {
    code: "PH",
    name: "Philippines",
    regions: [
      "Ilocos Region", "Cagayan Valley", "Central Luzon", "Calabarzon", "Mimaropa",
      "Bicol Region", "Western Visayas", "Central Visayas", "Eastern Visayas",
      "Zamboanga Peninsula", "Northern Mindanao", "Davao Region", "Soccsksargen",
      "Caraga", "Bangsamoro", "Cordillera Administrative Region", "National Capital Region"
    ]
  },
  {
    code: "BR",
    name: "Brazil",
    regions: [
      "Acre", "Alagoas", "Amapá", "Amazonas", "Bahia", "Ceará", "Distrito Federal",
      "Espírito Santo", "Goiás", "Maranhão", "Mato Grosso", "Mato Grosso do Sul",
      "Minas Gerais", "Pará", "Paraíba", "Paraná", "Pernambuco", "Piauí",
      "Rio de Janeiro", "Rio Grande do Norte", "Rio Grande do Sul", "Rondônia",
      "Roraima", "Santa Catarina", "São Paulo", "Sergipe", "Tocantins"
    ]
  },
  {
    code: "MX",
    name: "Mexico",
    regions: [
      "Aguascalientes", "Baja California", "Baja California Sur", "Campeche", "Chiapas",
      "Chihuahua", "Coahuila", "Colima", "Durango", "Guanajuato", "Guerrero",
      "Hidalgo", "Jalisco", "Mexico City", "México", "Michoacán", "Morelos",
      "Nayarit", "Nuevo León", "Oaxaca", "Puebla", "Querétaro", "Quintana Roo",
      "San Luis Potosí", "Sinaloa", "Sonora", "Tabasco", "Tamaulipas", "Tlaxcala",
      "Veracruz", "Yucatán", "Zacatecas"
    ]
  },
  {
    code: "AR",
    name: "Argentina",
    regions: [
      "Buenos Aires", "Catamarca", "Chaco", "Chubut", "Córdoba", "Corrientes",
      "Entre Ríos", "Formosa", "Jujuy", "La Pampa", "La Rioja", "Mendoza",
      "Misiones", "Neuquén", "Río Negro", "Salta", "San Juan", "San Luis",
      "Santa Cruz", "Santa Fe", "Santiago del Estero", "Tierra del Fuego", "Tucumán"
    ]
  },
  {
    code: "CL",
    name: "Chile",
    regions: [
      "Arica y Parinacota", "Tarapacá", "Antofagasta", "Atacama", "Coquimbo",
      "Valparaíso", "Santiago Metropolitan", "O'Higgins", "Maule", "Ñuble",
      "Biobío", "Araucanía", "Los Ríos", "Los Lagos", "Aysén", "Magallanes"
    ]
  },
  {
    code: "CO",
    name: "Colombia",
    regions: [
      "Amazonas", "Antioquia", "Arauca", "Atlántico", "Bogotá", "Bolívar", "Boyacá",
      "Caldas", "Caquetá", "Casanare", "Cauca", "Cesar", "Chocó", "Córdoba",
      "Cundinamarca", "Guainía", "Guaviare", "Huila", "La Guajira", "Magdalena",
      "Meta", "Nariño", "Norte de Santander", "Putumayo", "Quindío", "Risaralda",
      "San Andrés y Providencia", "Santander", "Sucre", "Tolima", "Valle del Cauca",
      "Vaupés", "Vichada"
    ]
  },
  {
    code: "PE",
    name: "Peru",
    regions: [
      "Amazonas", "Áncash", "Apurímac", "Arequipa", "Ayacucho", "Cajamarca",
      "Callao", "Cusco", "Huancavelica", "Huánuco", "Ica", "Junín", "La Libertad",
      "Lambayeque", "Lima", "Loreto", "Madre de Dios", "Moquegua", "Pasco",
      "Piura", "Puno", "San Martín", "Tacna", "Tumbes", "Ucayali"
    ]
  },
  {
    code: "UZ",
    name: "Uzbekistan",
    regions: [
      "Andijan", "Bukhara", "Fergana", "Jizzakh", "Karakalpakstan", "Kashkadarya",
      "Khorezm", "Namangan", "Navoi", "Samarkand", "Sirdaryo", "Surkhandarya",
      "Tashkent", "Tashkent City"
    ]
  },
  {
    code: "KZ",
    name: "Kazakhstan",
    regions: [
      "Akmola", "Aktobe", "Almaty", "Almaty City", "Astana", "Atyrau", "East Kazakhstan",
      "Jambyl", "Karaganda", "Kostanay", "Kyzylorda", "Mangystau", "North Kazakhstan",
      "Pavlodar", "Shymkent", "Turkestan", "West Kazakhstan"
    ]
  },
  {
    code: "NZ",
    name: "New Zealand",
    regions: [
      "Auckland", "Bay of Plenty", "Canterbury", "Gisborne", "Hawke's Bay",
      "Manawatu-Wanganui", "Marlborough", "Nelson", "Northland", "Otago",
      "Southland", "Taranaki", "Tasman", "Waikato", "Wellington", "West Coast"
    ]
  },
  {
    code: "IL",
    name: "Israel",
    regions: [
      "Central District", "Haifa District", "Jerusalem District", "Northern District",
      "Southern District", "Tel Aviv District"
    ]
  },
  {
    code: "JO",
    name: "Jordan",
    regions: [
      "Ajloun", "Amman", "Aqaba", "Balqa", "Irbid", "Jerash", "Karak", "Ma'an",
      "Madaba", "Mafraq", "Tafilah", "Zarqa"
    ]
  },
  {
    code: "LB",
    name: "Lebanon",
    regions: [
      "Akkar", "Baalbek-Hermel", "Beirut", "Beqaa", "Mount Lebanon",
      "Nabatieh", "North Governorate", "South Governorate"
    ]
  },
  {
    code: "QA",
    name: "Qatar",
    regions: [
      "Ad Dawhah", "Al Khawr", "Al Rayyan", "Al Shamal", "Al Wakrah",
      "Ash Shahaniyah", "Madinat ash Shamal", "Umm Salal"
    ]
  },
  {
    code: "KW",
    name: "Kuwait",
    regions: [
      "Ahmadi", "Capital", "Farwaniya", "Hawalli", "Jahra", "Mubarak Al-Kabeer"
    ]
  },
  {
    code: "BH",
    name: "Bahrain",
    regions: [
      "Capital", "Central", "Muharraq", "Northern", "Southern"
    ]
  },
  {
    code: "OM",
    name: "Oman",
    regions: [
      "Ad Dakhiliyah", "Ad Dhahirah", "Al Batinah North", "Al Batinah South",
      "Al Buraymi", "Al Wusta", "Ash Sharqiyah North", "Ash Sharqiyah South",
      "Dhofar", "Musandam", "Muscat"
    ]
  },
  {
    code: "MA",
    name: "Morocco",
    regions: [
      "Béni Mellal-Khénifra", "Casablanca-Settat", "Dakhla-Oued Ed-Dahab",
      "Drâa-Tafilalet", "Fès-Meknès", "Guelmim-Oued Noun", "Laâyoune-Sakia El Hamra",
      "Marrakech-Safi", "Oriental", "Rabat-Salé-Kénitra", "Souss-Massa",
      "Tanger-Tétouan-Al Hoceïma"
    ]
  },
  {
    code: "TN",
    name: "Tunisia",
    regions: [
      "Ariana", "Béja", "Ben Arous", "Bizerte", "Gabès", "Gafsa", "Jendouba",
      "Kairouan", "Kasserine", "Kébili", "Kef", "Mahdia", "Manouba", "Médenine",
      "Monastir", "Nabeul", "Sfax", "Sidi Bouzid", "Siliana", "Sousse",
      "Tataouine", "Tozeur", "Tunis", "Zaghouan"
    ]
  }
];

// Helper functions
export const getCountryByCode = (code: string): CountryRegion | undefined => {
  return countryRegions.find(c => c.code.toLowerCase() === code.toLowerCase());
};

export const getCountryByName = (name: string): CountryRegion | undefined => {
  return countryRegions.find(c => c.name.toLowerCase() === name.toLowerCase());
};

export const getRegionsForCountry = (countryNameOrCode: string): string[] => {
  const country = getCountryByName(countryNameOrCode) || getCountryByCode(countryNameOrCode);
  return country?.regions || [];
};

export const getAllCountryNames = (): string[] => {
  return countryRegions.map(c => c.name).sort();
};

export const getAllCountryCodes = (): string[] => {
  return countryRegions.map(c => c.code);
};
