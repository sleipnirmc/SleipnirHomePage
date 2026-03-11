window.MOCK_DATA = {
    members: [
        { id: 'mem001', name: 'Gunnar Sigurðsson', nickname: 'Gunni', role: 'Forseti', photo: null, motorcycle: { year: 2019, make: 'Harley-Davidson', model: 'Road King' }, chapter: 'Reykjavik', joinDate: '2015-06-15', email: 'gunnar@sleipnirmc.is', phone: '+354 555 1234' },
        { id: 'mem002', name: 'Bjarni Þórsson', nickname: 'Bjössi', role: 'Varaforseti', photo: null, motorcycle: { year: 2021, make: 'Indian', model: 'Chief Bobber' }, chapter: 'Reykjavik', joinDate: '2016-03-20', email: 'bjarni@sleipnirmc.is', phone: '+354 555 2345' },
        { id: 'mem003', name: 'Helgi Magnússon', role: 'Gjaldkeri', photo: null, motorcycle: { year: 2020, make: 'Harley-Davidson', model: 'Street Glide' }, chapter: 'Reykjavik', joinDate: '2015-06-15', email: 'helgi@sleipnirmc.is' },
        { id: 'mem004', name: 'Kristján Ólafsson', role: 'Ritari', photo: null, motorcycle: { year: 2018, make: 'Triumph', model: 'Bonneville T120' }, chapter: 'Akureyri', joinDate: '2017-09-01', email: 'kristjan@gmail.com' },
        { id: 'mem005', name: 'Sigurður Einarsson', nickname: 'Siggi', role: 'Vegamaður', photo: null, motorcycle: { year: 2022, make: 'BMW', model: 'R 1250 GS Adventure' }, chapter: 'Reykjavik', joinDate: '2016-11-10', email: 'siggi@outlook.com' },
        { id: 'mem006', name: 'Ragnar Jónsson', role: 'Meðlimur', photo: null, motorcycle: { year: 2017, make: 'Harley-Davidson', model: 'Sportster 1200' }, chapter: 'Akureyri', joinDate: '2019-04-22', email: 'ragnar.j@sleipnirmc.is' },
        { id: 'mem007', name: 'Einar Guðmundsson', role: 'Meðlimur', photo: null, motorcycle: { year: 2023, make: 'Honda', model: 'Gold Wing' }, chapter: 'Reykjavik', joinDate: '2020-02-14', email: 'einar.g@yahoo.com' }
    ],
    users: [
        { id: 'usr001', displayName: 'Gunnar Sigurðsson', email: 'gunnar@sleipnirmc.is', role: 'admin', members: true, createdAt: '2015-06-15', lastLogin: '2026-03-10' },
        { id: 'usr002', displayName: 'Bjarni Þórsson', email: 'bjarni@sleipnirmc.is', role: 'user', members: true, createdAt: '2016-03-20', lastLogin: '2026-03-09' },
        { id: 'usr003', displayName: 'Helgi Magnússon', email: 'helgi@sleipnirmc.is', role: 'user', members: true, createdAt: '2015-06-15', lastLogin: '2026-03-08' },
        { id: 'usr004', displayName: 'Kristján Ólafsson', email: 'kristjan@gmail.com', role: 'user', members: true, createdAt: '2017-09-01', lastLogin: '2026-03-05' },
        { id: 'usr005', displayName: 'Sigurður Einarsson', email: 'siggi@outlook.com', role: 'user', members: true, createdAt: '2016-11-10', lastLogin: '2026-03-10' },
        { id: 'usr006', displayName: 'Anna Björnsdóttir', email: 'anna.b@gmail.com', role: 'user', members: false, createdAt: '2024-11-15', lastLogin: '2026-03-01' },
        { id: 'usr007', displayName: 'Ólafur Haraldsson', email: 'olafur.h@hotmail.com', role: 'user', members: false, createdAt: '2025-01-20', lastLogin: '2026-02-28' },
        { id: 'usr008', displayName: 'Ragnar Jónsson', email: 'ragnar.j@sleipnirmc.is', role: 'user', members: true, createdAt: '2019-04-22', lastLogin: '2026-03-07' },
        { id: 'usr009', displayName: 'Freyja Guðnadóttir', email: 'freyja.g@gmail.com', role: 'user', members: false, createdAt: '2025-06-10', lastLogin: '2026-03-03' },
        { id: 'usr010', displayName: 'Einar Guðmundsson', email: 'einar.g@yahoo.com', role: 'user', members: true, createdAt: '2020-02-14', lastLogin: '2026-03-09' },
        { id: 'usr011', displayName: 'Þorsteinn Karlsson', email: 'thorsteinn@proton.me', role: 'user', members: false, createdAt: '2025-12-01', lastLogin: '2026-01-15' },
        { id: 'usr012', displayName: 'Hildur Sigurðardóttir', email: 'hildur.s@gmail.com', role: 'user', members: false, createdAt: '2026-01-05', lastLogin: '2026-03-10' }
    ],
    products: [
        { id: 'prd001', nameIs: 'Sleipnir MC Bolur', nameEn: 'Sleipnir MC T-Shirt', description: 'Klassískur bolur með klúbbmerkinu', category: 'tshirt', price: 5900, availableSizes: ['S','M','L','XL','XXL'], membersOnly: false, isNew: false, isPopular: true, createdAt: '2024-06-01' },
        { id: 'prd002', nameIs: 'Sleipnir Hettupeysа', nameEn: 'Sleipnir Hoodie', description: 'Heit og stíllhrein hettupeysа', category: 'hoodie', price: 12900, availableSizes: ['S','M','L','XL'], membersOnly: false, isNew: false, isPopular: true, createdAt: '2024-06-01' },
        { id: 'prd003', nameIs: 'Leðurvestið', nameEn: 'Leather Vest', description: 'Ekta leðurvest með útsaumuðu merki', category: 'jacket', price: 34900, availableSizes: ['S','M','L','XL','XXL'], membersOnly: true, isNew: false, isPopular: false, createdAt: '2024-08-15' },
        { id: 'prd004', nameIs: 'Vindjakki', nameEn: 'Wind Jacket', description: 'Vatnsvarinn vindjakki fyrir akstur', category: 'jacket', price: 18900, availableSizes: ['M','L','XL'], membersOnly: false, isNew: true, isPopular: false, createdAt: '2026-02-01' },
        { id: 'prd005', nameIs: 'MC Húfa', nameEn: 'MC Beanie', description: 'Hlý húfa með lógói', category: 'other', price: 3900, availableSizes: ['One Size'], membersOnly: false, isNew: true, isPopular: true, createdAt: '2026-01-15' },
        { id: 'prd006', nameIs: 'Ríðingbuxur', nameEn: 'Riding Jeans', description: 'Aramid-styrkt buxur', category: 'jeans', price: 21900, availableSizes: ['30','32','34','36'], membersOnly: false, isNew: false, isPopular: false, createdAt: '2025-05-10' },
        { id: 'prd007', nameIs: 'Merkjasett', nameEn: 'Patch Set', description: 'Merkjasett - 3 stk', category: 'other', price: 4500, availableSizes: ['One Size'], membersOnly: true, isNew: false, isPopular: false, createdAt: '2024-09-01' },
        { id: 'prd008', nameIs: 'Sleipnir Bandana', nameEn: 'Sleipnir Bandana', description: 'Svart bandana með rauðu merki', category: 'other', price: 2900, availableSizes: ['One Size'], membersOnly: false, isNew: true, isPopular: false, createdAt: '2026-03-01' }
    ],
    events: [
        { id: 'evt001', nameIs: 'Vorakstur 2026', nameEn: 'Spring Ride 2026', description: 'Fyrsti sameiginlegi aksturinn á nýju ári', date: '2026-04-15T10:00', location: 'Harpa, Reykjavík', category: 'ride', attendees: 14 },
        { id: 'evt002', nameIs: 'Mánaðarfundur Mars', nameEn: 'March Monthly Meeting', description: 'Reglubundinn mánaðarfundur', date: '2026-03-20T20:00', location: 'Klubbhúsið, Grandi', category: 'meeting', attendees: 18 },
        { id: 'evt003', nameIs: 'Sumarpartý', nameEn: 'Summer Party', description: 'Árlegt sumarpartý klúbbsins', date: '2026-06-21T18:00', location: 'Laugardalur, Reykjavík', category: 'social', attendees: 35 },
        { id: 'evt004', nameIs: 'Góðgerðarakstur', nameEn: 'Charity Ride', description: 'Akstur í þágu Rauða krossins', date: '2026-05-10T09:00', location: 'Hringvegur', category: 'charity', attendees: 22 },
        { id: 'evt005', nameIs: 'Viðhaldshelgi', nameEn: 'Maintenance Weekend', description: 'Sameiginlegt viðhald hjóla', date: '2026-04-05T11:00', location: 'Verkstæðið, Hafnarfjörður', category: 'maintenance', attendees: 8 },
        { id: 'evt006', nameIs: 'Akureyri Rally', nameEn: 'Akureyri Rally', description: 'Árlega rallýið til Akureyrar', date: '2026-07-12T07:00', location: 'Akureyri', category: 'ride', attendees: 20 }
    ],
    orders: [
        { id: 'ord001', userName: 'Anna Björnsdóttir', userEmail: 'anna.b@gmail.com', items: [{productName:'Sleipnir MC Bolur', size:'M', quantity:2}], totalAmount: 11800, status: 'pending', createdAt: '2026-03-08' },
        { id: 'ord002', userName: 'Ólafur Haraldsson', userEmail: 'olafur.h@hotmail.com', items: [{productName:'Sleipnir Hettupeysа', size:'L', quantity:1}], totalAmount: 12900, status: 'pending', createdAt: '2026-03-07' },
        { id: 'ord003', userName: 'Freyja Guðnadóttir', userEmail: 'freyja.g@gmail.com', items: [{productName:'MC Húfa', size:'One Size', quantity:1},{productName:'Sleipnir Bandana', size:'One Size', quantity:2}], totalAmount: 9700, status: 'processing', createdAt: '2026-03-05' },
        { id: 'ord004', userName: 'Hildur Sigurðardóttir', userEmail: 'hildur.s@gmail.com', items: [{productName:'Sleipnir MC Bolur', size:'S', quantity:1}], totalAmount: 5900, status: 'pending', createdAt: '2026-03-04' },
        { id: 'ord005', userName: 'Bjarni Þórsson', userEmail: 'bjarni@sleipnirmc.is', items: [{productName:'Vindjakki', size:'XL', quantity:1}], totalAmount: 18900, status: 'completed', createdAt: '2026-02-28', completedAt: '2026-03-02' },
        { id: 'ord006', userName: 'Sigurður Einarsson', userEmail: 'siggi@outlook.com', items: [{productName:'Ríðingbuxur', size:'34', quantity:1}], totalAmount: 21900, status: 'completed', createdAt: '2026-02-25', completedAt: '2026-02-27' },
        { id: 'ord007', userName: 'Gunnar Sigurðsson', userEmail: 'gunnar@sleipnirmc.is', items: [{productName:'Leðurvestið', size:'L', quantity:1}], totalAmount: 34900, status: 'completed', createdAt: '2026-02-20', completedAt: '2026-02-22' },
        { id: 'ord008', userName: 'Anna Björnsdóttir', userEmail: 'anna.b@gmail.com', items: [{productName:'MC Húfa', size:'One Size', quantity:3}], totalAmount: 11700, status: 'completed', createdAt: '2026-02-15', completedAt: '2026-02-17' },
        { id: 'ord009', userName: 'Ragnar Jónsson', userEmail: 'ragnar.j@sleipnirmc.is', items: [{productName:'Merkjasett', size:'One Size', quantity:1}], totalAmount: 4500, status: 'completed', createdAt: '2026-02-10', completedAt: '2026-02-12' },
        { id: 'ord010', userName: 'Einar Guðmundsson', userEmail: 'einar.g@yahoo.com', items: [{productName:'Sleipnir Hettupeysа', size:'M', quantity:1},{productName:'Sleipnir MC Bolur', size:'M', quantity:1}], totalAmount: 18800, status: 'pending', createdAt: '2026-03-09' },
        { id: 'ord011', userName: 'Þorsteinn Karlsson', userEmail: 'thorsteinn@proton.me', items: [{productName:'Sleipnir Bandana', size:'One Size', quantity:1}], totalAmount: 2900, status: 'cancelled', createdAt: '2026-03-01' },
        { id: 'ord012', userName: 'Kristján Ólafsson', userEmail: 'kristjan@gmail.com', items: [{productName:'Vindjakki', size:'L', quantity:1}], totalAmount: 18900, status: 'completed', createdAt: '2026-01-20', completedAt: '2026-01-25' },
        { id: 'ord013', userName: 'Helgi Magnússon', userEmail: 'helgi@sleipnirmc.is', items: [{productName:'Sleipnir MC Bolur', size:'XL', quantity:2},{productName:'MC Húfa', size:'One Size', quantity:1}], totalAmount: 15700, status: 'completed', createdAt: '2026-01-10', completedAt: '2026-01-12' },
        { id: 'ord014', userName: 'Freyja Guðnadóttir', userEmail: 'freyja.g@gmail.com', items: [{productName:'Sleipnir Hettupeysа', size:'S', quantity:1}], totalAmount: 12900, status: 'processing', createdAt: '2026-03-10' },
        { id: 'ord015', userName: 'Ólafur Haraldsson', userEmail: 'olafur.h@hotmail.com', items: [{productName:'Ríðingbuxur', size:'32', quantity:1},{productName:'Sleipnir MC Bolur', size:'L', quantity:1}], totalAmount: 27800, status: 'pending', createdAt: '2026-03-10' }
    ]
};