export const NAV = [
  { id: "home", label: "Home", icon: "ti-home" },
  { id: "browse", label: "Browse", icon: "ti-compass" },
  { id: "library", label: "My Library", icon: "ti-library" },
  { id: "upload", label: "Upload", icon: "ti-cloud-upload" },
];

export const GENRES = ["All", "Qasidas", "Nasheeds", "Duff", "Instrumental", "Madrassa"];

export const TRACKS = [
  { id: 1, title: "Ya Nabi Salam Alayka", artist: "Madrassa Al-Noor", album: "Salawat Collection", genre: "Qasidas", duration: "4:32", plays: "124k", bg: "bg-emerald-800" },
  { id: 2, title: "Tala Al Badru Alayna", artist: "Sheikh Abdullah", album: "Madinah Nights", genre: "Nasheeds", duration: "3:18", plays: "89k", bg: "bg-violet-800" },
  { id: 3, title: "Duff Ensemble Vol. 1", artist: "Dar Al Qasida", album: "Rhythms of Devotion", genre: "Duff", duration: "5:44", plays: "52k", bg: "bg-orange-800" },
  { id: 4, title: "Mawlid Al Nabi", artist: "Ustadh Yusuf", album: "Mawlid Collection", genre: "Qasidas", duration: "6:10", plays: "201k", bg: "bg-teal-800" },
  { id: 5, title: "Subhanallah", artist: "Nasheed Group", album: "Dhikr Sessions", genre: "Nasheeds", duration: "3:55", plays: "67k", bg: "bg-indigo-800" },
  { id: 6, title: "Oud Reflections", artist: "Hassan Al-Oud", album: "Spiritual Journey", genre: "Instrumental", duration: "7:22", plays: "38k", bg: "bg-amber-800" },
];

export const ARTISTS = [
  { id: 1, name: "Madrassa Al-Noor", tracks: 47, followers: "12.4k", bg: "bg-emerald-800" },
  { id: 2, name: "Dar Al Qasida", tracks: 31, followers: "8.1k", bg: "bg-violet-800" },
  { id: 3, name: "Sheikh Abdullah", tracks: 22, followers: "19.2k", bg: "bg-orange-800" },
  { id: 4, name: "Ustadh Yusuf", tracks: 58, followers: "34.7k", bg: "bg-teal-800" },
];

export const PLAYLISTS = ["Fajr Morning", "Ramadan Nights", "Evening Adhkar"];

export const MOCK_TRACKS = [
  { id:"t1", title:"Ya Nabi Salam Alayka", artist:{ id:"a1", name:"Madrassa Al-Noor"  }, genre:"QASIDAS",      duration:272, playCount:124000 },
  { id:"t2", title:"Tala Al Badru Alayna", artist:{ id:"a2", name:"Sheikh Abdullah"   }, genre:"NASHEEDS",     duration:198, playCount:89000  },
  { id:"t3", title:"Duff Ensemble Vol. 1", artist:{ id:"a3", name:"Dar Al-Qasida"     }, genre:"DUFF",         duration:344, playCount:52000  },
  { id:"t4", title:"Mawlid Al Nabi",       artist:{ id:"a1", name:"Madrassa Al-Noor"  }, genre:"QASIDAS",      duration:370, playCount:201000 },
  { id:"t5", title:"Subhanallah",          artist:{ id:"a2", name:"Sheikh Abdullah"   }, genre:"NASHEEDS",     duration:235, playCount:67000  },
  { id:"t6", title:"Oud Reflections",      artist:{ id:"a4", name:"Hassan Al-Oud"     }, genre:"INSTRUMENTAL", duration:442, playCount:38000  },
];
export const MOCK_ARTISTS = [
  { id:"a1", name:"Madrassa Al-Noor", isMadrassa:true,  isVerified:true,  _count:{tracks:47,albums:4}, user:{_count:{followers:1240}} },
  { id:"a2", name:"Sheikh Abdullah",  isMadrassa:false, isVerified:true,  _count:{tracks:22,albums:2}, user:{_count:{followers:1920}} },
  { id:"a3", name:"Dar Al-Qasida",    isMadrassa:false, isVerified:false, _count:{tracks:31,albums:3}, user:{_count:{followers:810 }} },
  { id:"a4", name:"Hassan Al-Oud",    isMadrassa:false, isVerified:false, _count:{tracks:14,albums:1}, user:{_count:{followers:420 }} },
];
