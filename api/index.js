// api/index.js
const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const BASE_URL = 'https://themoviebox.org';
const PROXY_URL = 'https://cors.caliph.my.id/?url=';

// Helper fetch dengan error handling super ketat
const fetchWithProxy = async (url) => {
  try {
    console.log('Fetching:', url);
    const response = await axios.get(PROXY_URL + encodeURIComponent(url), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000,
      validateStatus: false // Jangan lempar error buat status apa pun
    });
    
    console.log('Response status:', response.status);
    return response.data;
  } catch (error) {
    console.error('Proxy fetch error detail:', {
      message: error.message,
      code: error.code,
      status: error.response?.status
    });
    
    // Return HTML kosong atau pesan error sebagai string
    return '<html><body>Error fetching data</body></html>';
  }
};

// ================== FUNGSI SCRAPING ==================
const getHomepage = async () => {
  try {
    const html = await fetchWithProxy(BASE_URL);
    
    // Cek kalo html nya error
    if (!html || html.includes('Error fetching')) {
      console.log('HTML fetch failed, returning dummy data');
      return {
        trending: DUMMY_MOVIES,
        latest: DUMMY_MOVIES.slice(0, 5),
        series: DUMMY_MOVIES.slice(0, 5),
        featured: DUMMY_FEATURED
      };
    }
    
    const $ = cheerio.load(html);
    
    const trending = [];
    const latest = [];
    const series = [];
    const featured = [];

    // Cari selector yang mungkin ada di themoviebox.org
    $('.film-item, .movie-item, .item, .post').each((i, el) => {
      if (i < 10) {
        const title = $(el).find('.title, h3, .name, .judul').first().text().trim() || 'Unknown Title';
        const image = $(el).find('img').attr('src') || $(el).find('img').attr('data-src') || 'https://via.placeholder.com/300x450?text=No+Image';
        const link = $(el).find('a').attr('href') || '#';
        const quality = $(el).find('.quality, .res').text().trim() || 'HD';
        
        trending.push({
          title,
          image: image.startsWith('http') ? image : `https:${image}`,
          url: link.startsWith('http') ? link : `${BASE_URL}${link}`,
          quality,
          year: '2024'
        });
      }
    });

    // Kalo kosong, pake dummy data
    if (trending.length === 0) {
      return {
        trending: DUMMY_MOVIES,
        latest: DUMMY_MOVIES.slice(0, 5),
        series: DUMMY_MOVIES.slice(0, 5),
        featured: DUMMY_FEATURED
      };
    }

    return { 
      trending, 
      latest: trending.slice(0, 8), 
      series: trending.slice(0, 8),
      featured: trending.slice(0, 3).map(m => ({
        ...m,
        description: 'Film keren banget, wajib ditonton! 🍿'
      }))
    };
  } catch (error) {
    console.error('Homepage scrape error:', error);
    return {
      trending: DUMMY_MOVIES,
      latest: DUMMY_MOVIES.slice(0, 5),
      series: DUMMY_MOVIES.slice(0, 5),
      featured: DUMMY_FEATURED
    };
  }
};

// DUMMY DATA sebagai fallback kalo scrape gagal
const DUMMY_MOVIES = [
  {
    title: 'Dune: Part Two',
    image: 'https://via.placeholder.com/300x450/141414/e50914?text=Dune+2',
    url: '#',
    quality: '4K',
    year: '2024'
  },
  {
    title: 'Godzilla x Kong',
    image: 'https://via.placeholder.com/300x450/141414/e50914?text=Godzilla',
    url: '#',
    quality: 'HD',
    year: '2024'
  },
  {
    title: 'Kung Fu Panda 4',
    image: 'https://via.placeholder.com/300x450/141414/e50914?text=Kung+Fu+Panda',
    url: '#',
    quality: 'HD',
    year: '2024'
  },
  {
    title: 'Ghostbusters',
    image: 'https://via.placeholder.com/300x450/141414/e50914?text=Ghostbusters',
    url: '#',
    quality: 'HD',
    year: '2023'
  },
  {
    title: 'The Fall Guy',
    image: 'https://via.placeholder.com/300x450/141414/e50914?text=Fall+Guy',
    url: '#',
    quality: 'HD',
    year: '2024'
  }
];

const DUMMY_FEATURED = [
  {
    title: 'Dune: Part Two',
    description: 'Perjalanan Paul Atreides berlanjut dalam epik sci-fi yang spektakuler!',
    image: 'https://via.placeholder.com/1200x500/141414/e50914?text=Dune+2+Featured',
    url: '#'
  },
  {
    title: 'Godzilla x Kong',
    description: 'Dua monster legendaris bersatu melawan ancaman baru!',
    image: 'https://via.placeholder.com/1200x500/141414/e50914?text=Godzilla+x+Kong',
    url: '#'
  }
];

// ================== ROUTES API ==================
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    status: 'OK',
    message: 'MovieBox API is running! 🎬',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/home', async (req, res) => {
  try {
    console.log('Home endpoint called');
    const data = await getHomepage();
    res.json({ success: true, data });
  } catch (error) {
    console.error('Home endpoint error:', error);
    // Fallback: kirim dummy data kalo error
    res.json({ 
      success: true, 
      data: {
        trending: DUMMY_MOVIES,
        latest: DUMMY_MOVIES.slice(0, 5),
        series: DUMMY_MOVIES.slice(0, 5),
        featured: DUMMY_FEATURED
      }
    });
  }
});

// Route buat search (dummy dulu biar gak error)
app.get('/api/search', (req, res) => {
  const { q } = req.query;
  res.json({
    success: true,
    data: {
      results: DUMMY_MOVIES.map(m => ({ ...m, title: `${m.title} - ${q}` })),
      currentPage: 1,
      totalPages: 1,
      query: q
    }
  });
});

// Route buat detail (dummy)
app.get('/api/detail', (req, res) => {
  res.json({
    success: true,
    data: {
      title: 'Dune: Part Two',
      description: 'Film epik sci-fi dari Denis Villeneuve',
      poster: 'https://via.placeholder.com/500x750/141414/e50914?text=Dune+2',
      backdrop: 'https://via.placeholder.com/1200x500/141414/e50914?text=Dune+2+Backdrop',
      year: '2024',
      genre: 'Sci-Fi, Adventure',
      rating: '8.5',
      duration: '2h 46m',
      type: 'movie',
      url: '#',
      episodes: []
    }
  });
});

// Route buat watch (dummy)
app.get('/api/watch', (req, res) => {
  res.json({
    success: true,
    data: {
      servers: [
        { name: 'Server #1', url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', type: 'iframe' },
        { name: 'Server #2', url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', type: 'iframe' }
      ],
      downloads: [
        { quality: '1080p', url: '#' },
        { quality: '720p', url: '#' }
      ]
    }
  });
});

// Error handler middleware
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error: ' + err.message 
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    error: 'Endpoint not found bro!' 
  });
});

module.exports = app;
