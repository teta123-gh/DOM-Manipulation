// ==============================
// CONFIG
// ==============================
const CONFIG = {
  API_BASE: 'http://localhost:4000/api',   // Change to your backend port
  STORAGE_KEY: 'civic_events_auth',
};

// ==============================
// API SERVICE
// ==============================
const Api = {
  _token: null,

  setToken(token) { this._token = token; },
  getToken() { return this._token; },

  _headers(extra = {}) {
    const h = { 'Content-Type': 'application/json', ...extra };
    if (this._token) h['Authorization'] = `Bearer ${this._token}`;
    return h;
  },

  _handle(res) {
    if (!res.ok) {
      return res.json().then(err => { throw new Error(err.message || err.error || 'Request failed'); });
    }
    return res.json();
  },

  get(url) {
    return fetch(CONFIG.API_BASE + url, { headers: this._headers() }).then(this._handle);
  },

  post(url, body, isFormData = false) {
    const opts = { method: 'POST' };
    if (isFormData) {
      opts.body = body;
      const h = {};
      if (this._token) h['Authorization'] = `Bearer ${this._token}`;
      opts.headers = h;
    } else {
      opts.headers = this._headers();
      opts.body = JSON.stringify(body);
    }
    return fetch(CONFIG.API_BASE + url, opts).then(this._handle);
  },

  put(url, body, isFormData = false) {
    const opts = { method: 'PUT' };
    if (isFormData) {
      opts.body = body;
      const h = {};
      if (this._token) h['Authorization'] = `Bearer ${this._token}`;
      opts.headers = h;
    } else {
      opts.headers = this._headers();
      opts.body = JSON.stringify(body);
    }
    return fetch(CONFIG.API_BASE + url, opts).then(this._handle);
  },

  patch(url, body) {
    return fetch(CONFIG.API_BASE + url, {
      method: 'PATCH',
      headers: this._headers(),
      body: JSON.stringify(body),
    }).then(this._handle);
  },

  del(url) {
    return fetch(CONFIG.API_BASE + url, {
      method: 'DELETE',
      headers: this._headers(),
    }).then(this._handle);
  },

  upload(url, formData) {
    const h = {};
    if (this._token) h['Authorization'] = `Bearer ${this._token}`;
    return fetch(CONFIG.API_BASE + url, {
      method: 'POST',
      headers: h,
      body: formData,
    }).then(this._handle);
  },

  uploadPut(url, formData) {
    const h = {};
    if (this._token) h['Authorization'] = `Bearer ${this._token}`;
    return fetch(CONFIG.API_BASE + url, {
      method: 'PUT',
      headers: h,
      body: formData,
    }).then(this._handle);
  },
};

// ==============================
// AUTH
// ==============================
const Auth = {
  getAuth() {
    try {
      const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch { return null; }
  },

  setAuth(data) {
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(data));
    Api.setToken(data.token);
  },

  clear() {
    localStorage.removeItem(CONFIG.STORAGE_KEY);
    Api.setToken(null);
  },

  isLoggedIn() { return !!this.getAuth(); },

  getUser() { const a = this.getAuth(); return a ? a.user : null; },

  isAdmin() { const u = this.getUser(); return u && u.role === 'admin'; },
};

// ==============================
// MAIN APP (jQuery ready)
// ==============================
$(function() {

  // ---- State ----
  let currentPage = 'login';
  let events = [];
  let announcements = [];
  let promos = [];
  let notifications = [];
  let users = [];
  let registrations = [];
  let eventDetailId = null;
  let editingEventId = null;
  let allEvents = [];
  let allPromos = [];
  let allAnnouncements = [];

  // ---- Helpers ----
  function showToast(msg, type = 'info') {
    const colors = { info: 'bg-blue-500', success: 'bg-green-500', error: 'bg-red-500', warning: 'bg-yellow-500' };
    const id = 'toast-' + Date.now();
    const $el = $(`<div id="${id}" class="${colors[type] || 'bg-gray-700'} text-white px-5 py-3 rounded-lg shadow-lg text-sm flex items-center gap-3 transition-all duration-300 translate-x-full opacity-0">
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${msg}</span>
      </div>`);
    $('#toast-container').append($el);
    setTimeout(() => $el.removeClass('translate-x-full opacity-0').addClass('translate-x-0 opacity-100'), 50);
    setTimeout(() => {
      $el.removeClass('translate-x-0 opacity-100').addClass('translate-x-full opacity-0');
      setTimeout(() => $el.remove(), 400);
    }, 4000);
  }

  function formatDate(d) { if (!d) return '—'; const dt = new Date(d); return dt.toLocaleString(); }

  function getImageUrl(path) {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `http://localhost:4000/uploads/${path}`;
  }
  function getAudioUrl(path) {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `http://localhost:4000/uploads/${path}`;
  }
  function getVideoUrl(path) {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `http://localhost:4000/uploads/${path}`;
  }

  // ---- Navigation ----
  function navigate(page, data) {
    if (['login', 'signup'].includes(page)) {
      if (Auth.isLoggedIn() && page === 'login') page = 'events';
      else if (Auth.isLoggedIn() && page === 'signup') page = 'events';
    } else {
      if (!Auth.isLoggedIn()) { page = 'login'; }
    }

    if (['dashboard', 'users'].includes(page) && !Auth.isAdmin()) {
      showToast('Admin access required', 'error');
      return;
    }

    currentPage = page;
    $('.page-section').addClass('hidden');
    $(`#page-${page}`).removeClass('hidden');

    if (['login', 'signup'].includes(page)) {
      $('#main-header, #main-footer').addClass('hidden');
    } else {
      $('#main-header, #main-footer').removeClass('hidden');
    }

    $('.nav-link').removeClass('text-indigo-600 font-semibold').addClass('text-gray-600');
    $(`.nav-link[data-page="${page}"]`).removeClass('text-gray-600').addClass('text-indigo-600 font-semibold');

    if (Auth.isAdmin()) { $('.admin-only').removeClass('hidden'); } else { $('.admin-only').addClass('hidden'); }

    switch (page) {
      case 'dashboard': loadDashboard(); break;
      case 'events': loadEvents(); break;
      case 'event-detail': if (data) loadEventDetail(data); break;
      case 'event-form': if (data) loadEventForm(data); break;
      case 'announcements': loadAnnouncements(); break;
      case 'announcement-detail': if (data) loadAnnouncementDetail(data); break;
      case 'promos': loadPromos(); break;
      case 'promo-detail': if (data) loadPromoDetail(data); break;
      case 'notifications': loadNotifications(); break;
      case 'profile': loadProfile(); break;
      case 'registrations': loadRegistrations(); break;
      case 'users': loadUsers(); break;
    }

    const u = Auth.getUser();
    if (u) $('#profile-name-short').text(u.full_name || 'User');
  }

  // ---- Page Loaders ----
  async function loadDashboard() {
    try {
      const stats = await Api.get('/dashboard/admin');
      $('#stat-events').text(stats.total_events ?? '—');
      $('#stat-promos').text(stats.total_promos ?? '—');
      $('#stat-users').text(stats.total_users ?? '—');
      $('#stat-registrations').text(stats.total_registrations ?? '—');
    } catch (e) { showToast('Failed to load dashboard: ' + e.message, 'error'); }
  }

  async function loadEvents(filters = {}) {
    try {
      const q = new URLSearchParams(filters).toString();
      const data = await Api.get('/events' + (q ? '?' + q : ''));
      allEvents = data || [];
      renderEvents(allEvents);
    } catch (e) { showToast('Failed to load events: ' + e.message, 'error'); }
  }

  function renderEvents(items) {
    const $list = $('#events-list');
    if (!items || !items.length) {
      $list.html('<div class="col-span-full text-center text-gray-400 py-10">No events found.</div>');
      return;
    }
    let html = '';
    items.forEach(e => {
      const img = e.image_url || (e.metadata && e.metadata.image_url) || '';
      const imgHtml = img ? `<img src="${getImageUrl(img)}" class="w-full h-40 object-cover rounded-t-xl" />` :
        `<div class="w-full h-40 bg-gray-100 rounded-t-xl flex items-center justify-center text-gray-300"><i class="fas fa-image text-3xl"></i></div>`;
      const isAdmin = Auth.isAdmin();
      html += `
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition">
          ${imgHtml}
          <div class="p-4">
            <h3 class="font-bold text-gray-800 truncate">${e.title || 'Untitled'}</h3>
            <p class="text-sm text-gray-500 truncate">${e.location || 'No location'}</p>
            <p class="text-xs text-gray-400">${formatDate(e.starts_at)}</p>
            <div class="flex flex-wrap gap-2 mt-3">
              <button class="event-view-btn text-sm text-indigo-600 hover:underline" data-id="${e.id}">View</button>
              ${isAdmin ? `<button class="event-edit-btn text-sm text-blue-600 hover:underline" data-id="${e.id}">Edit</button>` : ''}
              ${isAdmin ? `<button class="event-delete-btn text-sm text-red-600 hover:underline" data-id="${e.id}">Delete</button>` : ''}
              ${e.published ? '<span class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Published</span>' : '<span class="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Draft</span>'}
            </div>
          </div>
        </div>
      `;
    });
    $list.html(html);
  }

  // === Event Detail ===
  async function loadEventDetail(id) {
    try {
      const data = await Api.get(`/events/${id}`);
      eventDetailId = id;
      const $c = $('#event-detail-container');
      const img = data.image_url || (data.metadata && data.metadata.image_url) || '';
      const imgHtml = img ? `<img src="${getImageUrl(img)}" class="w-full max-h-80 object-cover rounded-lg mb-4" />` : '';
      const isAdmin = Auth.isAdmin();
      const user = Auth.getUser();
      let regStatus = 'unknown';
      try {
        const regs = await Api.get('/event-registrations/my-registrations');
        const found = regs.find(r => r.event_id === id);
        regStatus = found ? 'registered' : 'not-registered';
      } catch (e) { regStatus = 'unknown'; }

      let feedbackHtml = '<p class="text-gray-400 text-sm">No feedback yet.</p>';
      let avgRating = 0;
      if (data.feedback && data.feedback.length) {
        const fb = data.feedback;
        avgRating = fb.reduce((s, f) => s + f.rating, 0) / fb.length;
        feedbackHtml = `
          <div class="flex items-center gap-2 mb-2"><span class="font-semibold">${avgRating.toFixed(1)}</span> ⭐ (${fb.length} reviews)</div>
          ${fb.slice(0,5).map(f => `<div class="text-sm border-b border-gray-100 py-2"><div class="flex items-center gap-1">${'⭐'.repeat(f.rating)}</div><p class="text-gray-600">${f.comment || ''}</p><span class="text-xs text-gray-400">${formatDate(f.created_at)}</span></div>`).join('')}
        `;
      }

      let registrantsHtml = '';
      if (isAdmin) {
        try {
          const attendees = await Api.get(`/event-registrations/event/${id}/attendees`);
          registrantsHtml = `<div class="mt-4"><p class="font-semibold">Registrants (${attendees.length})</p><ul class="text-sm text-gray-600">${attendees.map(a => `<li>${a.full_name || a.email}</li>`).join('')}</ul></div>`;
        } catch (e) { registrantsHtml = '<p class="text-sm text-gray-400">Could not load registrants.</p>'; }
      }

      $c.html(`
        ${imgHtml}
        <h2 class="text-2xl font-bold text-gray-800">${data.title || 'Untitled'}</h2>
        <p class="text-gray-600 mt-2">${data.description || ''}</p>
        <div class="flex flex-wrap gap-4 mt-3 text-sm text-gray-500">
          <span><i class="fas fa-map-marker-alt mr-1"></i>${data.location || 'N/A'}</span>
          <span><i class="far fa-calendar mr-1"></i>${formatDate(data.starts_at)} – ${formatDate(data.ends_at)}</span>
        </div>
        <div class="flex flex-wrap gap-3 mt-4">
          ${regStatus === 'registered' ? `<button id="event-cancel-reg-btn" class="bg-red-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-600 transition">Cancel Registration</button>` :
            regStatus === 'not-registered' ? `<button id="event-register-btn" class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 transition">Register</button>` : ''}
          ${isAdmin ? `<button class="event-edit-btn bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition" data-id="${data.id}">Edit</button>` : ''}
          ${isAdmin ? `<button class="event-delete-btn bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 transition" data-id="${data.id}">Delete</button>` : ''}
        </div>
        <div class="mt-6 border-t pt-4">
          <h4 class="font-semibold text-gray-700">📝 Feedback</h4>
          ${feedbackHtml}
          ${user && regStatus === 'registered' ? `<div class="mt-3"><form id="feedback-form" class="flex flex-wrap gap-3 items-end"><div><label class="text-sm text-gray-600">Rating</label><select id="fb-rating" class="border rounded px-2 py-1 text-sm"><option value="5">5⭐</option><option value="4">4⭐</option><option value="3">3⭐</option><option value="2">2⭐</option><option value="1">1⭐</option></select></div><div><label class="text-sm text-gray-600">Comment</label><input type="text" id="fb-comment" class="border rounded px-2 py-1 text-sm w-40" placeholder="Your feedback" /></div><button type="submit" class="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-indigo-700 transition">Submit</button></form></div>` : ''}
        </div>
        ${registrantsHtml}
      `);

      // Bind feedback
      $('#feedback-form').off('submit').on('submit', function(e) {
        e.preventDefault();
        const rating = parseInt($('#fb-rating').val());
        const comment = $('#fb-comment').val().trim();
        if (!rating) { showToast('Please select a rating', 'warning'); return; }
        Api.post('/event-feedback', { event_id: id, rating, comment })
          .then(() => { showToast('Feedback submitted!', 'success'); loadEventDetail(id); })
          .catch(err => showToast('Feedback failed: ' + err.message, 'error'));
      });

      $('#event-register-btn').off('click').on('click', function() {
        Api.post('/event-registrations/register', { event_id: id })
          .then(() => { showToast('Registered successfully!', 'success'); loadEventDetail(id); })
          .catch(err => showToast('Registration failed: ' + err.message, 'error'));
      });

      $('#event-cancel-reg-btn').off('click').on('click', function() {
        Api.post('/event-registrations/cancel', { event_id: id })
          .then(() => { showToast('Registration cancelled.', 'success'); loadEventDetail(id); })
          .catch(err => showToast('Cancel failed: ' + err.message, 'error'));
      });

    } catch (e) { showToast('Failed to load event: ' + e.message, 'error'); }
  }

  // === Event Form ===
  function loadEventForm(id) {
    editingEventId = id || null;
    const isEdit = !!id;
    $('#event-form-title').text(isEdit ? 'Edit Event' : 'Create Event');
    $('#event-form-id').val(id || '');
    $('#ef-title').val('');
    $('#ef-desc').val('');
    $('#ef-location').val('');
    $('#ef-starts').val('');
    $('#ef-ends').val('');
    $('#ef-published').prop('checked', false);
    $('#ef-image-preview').html('');

    if (isEdit) {
      Api.get(`/events/${id}`).then(data => {
        $('#ef-title').val(data.title || '');
        $('#ef-desc').val(data.description || '');
        $('#ef-location').val(data.location || '');
        if (data.starts_at) $('#ef-starts').val(data.starts_at.slice(0, 16));
        if (data.ends_at) $('#ef-ends').val(data.ends_at.slice(0, 16));
        $('#ef-published').prop('checked', !!data.published);
        const img = data.image_url || (data.metadata && data.metadata.image_url) || '';
        if (img) $('#ef-image-preview').html(`<img src="${getImageUrl(img)}" class="h-24 object-cover rounded border" />`);
      }).catch(err => showToast('Failed to load event: ' + err.message, 'error'));
    }

    $('#event-form').off('submit').on('submit', function(e) {
      e.preventDefault();
      const formData = new FormData();
      formData.append('title', $('#ef-title').val().trim());
      formData.append('description', $('#ef-desc').val().trim());
      formData.append('location', $('#ef-location').val().trim());
      formData.append('starts_at', $('#ef-starts').val());
      formData.append('ends_at', $('#ef-ends').val());
      formData.append('published', $('#ef-published').is(':checked') ? 'true' : 'false');
      const file = $('#ef-image')[0].files[0];
      if (file) formData.append('image', file);

      const url = isEdit ? `/events/${id}` : '/events';
      const method = isEdit ? Api.uploadPut(url, formData) : Api.upload(url, formData);
      method.then(() => {
        showToast(isEdit ? 'Event updated!' : 'Event created!', 'success');
        navigate('events');
      }).catch(err => showToast('Failed to save event: ' + err.message, 'error'));
    });
  }

  // === Announcements ===
  async function loadAnnouncements() {
    try {
      const data = await Api.get('/announcements');
      allAnnouncements = data || [];
      renderAnnouncements(allAnnouncements);
    } catch (e) { showToast('Failed to load announcements: ' + e.message, 'error'); }
  }

  function renderAnnouncements(items) {
    const $list = $('#announcements-list');
    if (!items || !items.length) {
      $list.html('<div class="col-span-full text-center text-gray-400 py-10">No announcements.</div>');
      return;
    }
    let html = '';
    items.forEach(a => {
      const isAdmin = Auth.isAdmin();
      html += `
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition">
          <h3 class="font-bold text-gray-800">${a.title || 'Untitled'}</h3>
          <p class="text-xs text-gray-400">${formatDate(a.created_at)}</p>
          <div class="flex items-center gap-2 mt-2">
            <audio controls class="w-full max-w-xs h-8">
              <source src="${getAudioUrl(a.audio_url)}" type="audio/mpeg" />
              Your browser does not support audio.
            </audio>
          </div>
          <div class="flex gap-3 mt-3">
            <button class="announcement-view-btn text-sm text-indigo-600 hover:underline" data-id="${a.id}">View</button>
            ${isAdmin ? `<button class="announcement-delete-btn text-sm text-red-600 hover:underline" data-id="${a.id}">Delete</button>` : ''}
            ${a.published ? '<span class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Published</span>' : '<span class="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Draft</span>'}
          </div>
        </div>
      `;
    });
    $list.html(html);
  }

  async function loadAnnouncementDetail(id) {
    try {
      const data = await Api.get(`/announcements/${id}`);
      const $c = $('#announcement-detail-container');
      $c.html(`
        <h2 class="text-2xl font-bold text-gray-800">${data.title || 'Untitled'}</h2>
        <p class="text-sm text-gray-400 mb-3">${formatDate(data.created_at)}</p>
        <audio controls class="w-full max-w-md mb-4">
          <source src="${getAudioUrl(data.audio_url)}" type="audio/mpeg" />
          Your browser does not support audio.
        </audio>
        <div class="text-sm text-gray-600">${data.description || ''}</div>
        ${data.published ? '<span class="inline-block mt-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Published</span>' : ''}
        ${Auth.isAdmin() ? `<button class="announcement-delete-btn mt-4 bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 transition" data-id="${data.id}">Delete</button>` : ''}
      `);
    } catch (e) { showToast('Failed to load announcement: ' + e.message, 'error'); }
  }

  // === Promos ===
  async function loadPromos() {
    try {
      const data = await Api.get('/promos');
      allPromos = data || [];
      renderPromos(allPromos);
    } catch (e) { showToast('Failed to load promos: ' + e.message, 'error'); }
  }

  function renderPromos(items) {
    const $list = $('#promos-list');
    if (!items || !items.length) {
      $list.html('<div class="col-span-full text-center text-gray-400 py-10">No promos.</div>');
      return;
    }
    let html = '';
    items.forEach(p => {
      const isAdmin = Auth.isAdmin();
      html += `
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition">
          <div class="aspect-video bg-gray-100 flex items-center justify-center">
            ${p.video_url ? `<video class="w-full h-full object-cover" muted><source src="${getVideoUrl(p.video_url)}" type="video/mp4" /></video>` : '<i class="fas fa-video text-3xl text-gray-300"></i>'}
          </div>
          <div class="p-4">
            <h3 class="font-bold text-gray-800 truncate">${p.title || 'Untitled'}</h3>
            <p class="text-sm text-gray-500 truncate">${p.description || ''}</p>
            <div class="flex flex-wrap gap-2 mt-3">
              <button class="promo-view-btn text-sm text-indigo-600 hover:underline" data-id="${p.id}">View</button>
              ${isAdmin ? `<button class="promo-delete-btn text-sm text-red-600 hover:underline" data-id="${p.id}">Delete</button>` : ''}
              ${p.published ? '<span class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Published</span>' : '<span class="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Draft</span>'}
            </div>
          </div>
        </div>
      `;
    });
    $list.html(html);
  }

  async function loadPromoDetail(id) {
    try {
      const data = await Api.get(`/promos/${id}`);
      const $c = $('#promo-detail-container');
      $c.html(`
        <h2 class="text-2xl font-bold text-gray-800">${data.title || 'Untitled'}</h2>
        <p class="text-sm text-gray-400 mb-3">${formatDate(data.created_at)}</p>
        ${data.video_url ? `<video controls class="w-full max-w-2xl rounded-lg mb-4" poster="${data.thumbnail_url || ''}">
          <source src="${getVideoUrl(data.video_url)}" type="video/mp4" />
          ${data.caption_text ? `<track kind="captions" src="${getVideoUrl(data.caption_text)}" srclang="en" label="English" default />` : ''}
          Your browser does not support video.
        </video>` : '<p class="text-gray-400">No video available.</p>'}
        <p class="text-gray-600">${data.description || ''}</p>
        ${data.caption_text ? `<p class="text-sm text-gray-500 mt-2"><strong>Caption:</strong> ${data.caption_text}</p>` : ''}
        ${data.published ? '<span class="inline-block mt-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Published</span>' : ''}
        ${Auth.isAdmin() ? `<button class="promo-delete-btn mt-4 bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 transition" data-id="${data.id}">Delete</button>` : ''}
      `);
    } catch (e) { showToast('Failed to load promo: ' + e.message, 'error'); }
  }

  // === Notifications ===
  async function loadNotifications() {
    try {
      const data = await Api.get('/notifications');
      notifications = data || [];
      renderNotifications(notifications);
      updateBadge();
    } catch (e) { showToast('Failed to load notifications: ' + e.message, 'error'); }
  }

  function renderNotifications(items) {
    const $list = $('#notifications-list');
    if (!items || !items.length) {
      $list.html('<div class="text-center text-gray-400 py-10">No notifications.</div>');
      return;
    }
    let html = '';
    items.forEach(n => {
      const isAdmin = Auth.isAdmin();
      html += `
        <div class="bg-white rounded-lg shadow-sm border border-gray-100 p-4 flex justify-between items-start">
          <div>
            <h4 class="font-semibold text-gray-800">${n.title || 'Notification'}</h4>
            <p class="text-sm text-gray-600">${n.message || ''}</p>
            <p class="text-xs text-gray-400">${formatDate(n.created_at)}</p>
          </div>
          ${isAdmin ? `<button class="notification-delete-btn text-red-500 hover:text-red-700 text-sm" data-id="${n.id}"><i class="fas fa-trash"></i></button>` : ''}
        </div>
      `;
    });
    $list.html(html);
  }

  function updateBadge() {
    const unread = notifications.filter(n => !n.read).length;
    if (unread > 0) {
      $('#unread-badge').text(unread).removeClass('hidden');
    } else {
      $('#unread-badge').addClass('hidden');
    }
  }

  // === Profile ===
  async function loadProfile() {
    try {
      const user = Auth.getUser();
      if (!user) return;
      const data = await Api.get('/users/profile/me');
      $('#profile-role').text(data.role || '—');
      $('#profile-status').text(data.is_active ? 'Active ✅' : 'Inactive ❌');
      $('#pf-name').val(data.full_name || '');
      $('#pf-email').val(data.email || '');
    } catch (e) { showToast('Failed to load profile: ' + e.message, 'error'); }
  }

  // === Registrations ===
  async function loadRegistrations() {
    try {
      const data = await Api.get('/event-registrations/my-registrations');
      registrations = data || [];
      renderRegistrations(registrations);
    } catch (e) { showToast('Failed to load registrations: ' + e.message, 'error'); }
  }

  function renderRegistrations(items) {
    const $list = $('#registrations-list');
    if (!items || !items.length) {
      $list.html('<div class="col-span-full text-center text-gray-400 py-10">You have not registered for any events.</div>');
      return;
    }
    let html = '';
    items.forEach(r => {
      const ev = r.event || {};
      html += `
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h3 class="font-bold text-gray-800">${ev.title || 'Untitled'}</h3>
          <p class="text-sm text-gray-500">${ev.location || ''}</p>
          <p class="text-xs text-gray-400">${formatDate(ev.starts_at)}</p>
          <button class="registration-cancel-btn mt-3 text-sm text-red-600 hover:underline" data-event-id="${ev.id}">Cancel Registration</button>
        </div>
      `;
    });
    $list.html(html);
  }

  // === Users (admin) ===
  async function loadUsers() {
    try {
      const data = await Api.get('/users');
      users = data || [];
      renderUsers(users);
    } catch (e) { showToast('Failed to load users: ' + e.message, 'error'); }
  }

  function renderUsers(items) {
    const $tbody = $('#users-tbody');
    if (!items || !items.length) {
      $tbody.html('<tr><td colspan="5" class="text-center text-gray-400 py-4">No users.</td></tr>');
      return;
    }
    let html = '';
    items.forEach(u => {
      html += `
        <tr>
          <td class="px-4 py-3 text-sm text-gray-800">${u.full_name || '—'}</td>
          <td class="px-4 py-3 text-sm text-gray-600">${u.email}</td>
          <td class="px-4 py-3 text-sm"><span class="px-2 py-0.5 rounded-full text-xs ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}">${u.role}</span></td>
          <td class="px-4 py-3 text-sm">${u.is_active ? '✅ Active' : '❌ Disabled'}</td>
          <td class="px-4 py-3 text-sm">
            ${u.role !== 'admin' ? `
              <button class="user-toggle-btn text-sm ${u.is_active ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'}" data-id="${u.id}" data-action="${u.is_active ? 'disable' : 'enable'}">
                ${u.is_active ? 'Disable' : 'Enable'}
              </button>
            ` : '<span class="text-xs text-gray-400">—</span>'}
          </td>
        </tr>
      `;
    });
    $tbody.html(html);
  }

  // ---- Event Listeners ----
  $(document).on('click', '[data-page]', function(e) {
    e.preventDefault();
    const page = $(this).data('page');
    const data = $(this).data('id') || null;
    navigate(page, data);
  });

  $('#profile-btn').on('click', function(e) {
    e.stopPropagation();
    $('#dropdown-menu').toggleClass('hidden');
  });
  $(document).on('click', function() { $('#dropdown-menu').addClass('hidden'); });

  $('#logout-btn').on('click', function() {
    Auth.clear();
    showToast('Logged out', 'info');
    navigate('login');
  });

  // ==============================
  // LOGIN — FIXED ✅
  // Server wraps response as { status, data: { token, user } }
  // ==============================
  $('#login-form').on('submit', function(e) {
    e.preventDefault();
    const email = $('#login-email').val().trim();
    const password = $('#login-password').val().trim();
    if (!email || !password) { showToast('Please fill in all fields.', 'warning'); return; }
    $('#login-btn').prop('disabled', true).text('Signing in…');
    Api.post('/auth/login', { email, password })
      .then(res => {
        // Support both { token, user } and { data: { token, user } } response shapes
        const token = (res.data && res.data.token) || res.token;
        const user  = (res.data && res.data.user)  || res.user;
        if (token && user) {
          Auth.setAuth({ token, user });
          showToast(`Welcome, ${user.full_name || 'User'}!`, 'success');
          navigate('events');
        } else {
          showToast('Invalid response from server.', 'error');
        }
      })
      .catch(err => showToast('Login failed: ' + err.message, 'error'))
      .finally(() => { $('#login-btn').prop('disabled', false).text('Sign In'); });
  });

  $('#signup-form').on('submit', function(e) {
    e.preventDefault();
    const name = $('#signup-name').val().trim();
    const email = $('#signup-email').val().trim();
    const password = $('#signup-password').val().trim();
    const confirm = $('#signup-confirm').val().trim();
    if (!name || !email || !password || !confirm) { showToast('Please fill in all fields.', 'warning'); return; }
    if (password !== confirm) { showToast('Passwords do not match.', 'error'); return; }
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      showToast('Password must be 8+ chars with uppercase, lowercase, number, and special character.', 'warning');
      return;
    }
    $('#signup-btn').prop('disabled', true).text('Signing up…');
    Api.post('/auth/signup', { full_name: name, email, password, role: 'user' })
      .then(() => {
        showToast('Account created! Please log in.', 'success');
        navigate('login');
      })
      .catch(err => showToast('Signup failed: ' + err.message, 'error'))
      .finally(() => { $('#signup-btn').prop('disabled', false).text('Sign Up'); });
  });

  $('#signup-password').on('input', function() {
    const val = $(this).val();
    let msg = '', color = 'text-gray-500';
    if (val.length >= 8 && /[A-Z]/.test(val) && /[a-z]/.test(val) && /[0-9]/.test(val) && /[^A-Za-z0-9]/.test(val)) {
      msg = '✅ Strong'; color = 'text-green-600';
    } else if (val.length >= 6) {
      msg = '⚠️ Weak — need 8+ chars, upper, lower, number, special'; color = 'text-yellow-600';
    } else if (val.length > 0) {
      msg = '❌ Too short'; color = 'text-red-500';
    }
    $('#password-strength').text(msg).removeClass('text-gray-500 text-green-600 text-yellow-600 text-red-500').addClass(color);
  });

  // Global event delegation for all dynamic buttons
  $(document).on('click', '.event-view-btn', function() { navigate('event-detail', $(this).data('id')); });
  $(document).on('click', '.event-edit-btn', function() { navigate('event-form', $(this).data('id')); });
  $(document).on('click', '.event-delete-btn', function() {
    const id = $(this).data('id');
    if (!confirm('Delete this event?')) return;
    Api.del(`/events/${id}`).then(() => { showToast('Event deleted.', 'success'); navigate('events'); })
      .catch(err => showToast('Delete failed: ' + err.message, 'error'));
  });

  $(document).on('click', '.announcement-view-btn', function() { navigate('announcement-detail', $(this).data('id')); });
  $(document).on('click', '.announcement-delete-btn', function() {
    const id = $(this).data('id');
    if (!confirm('Delete this announcement?')) return;
    Api.del(`/announcements/${id}`).then(() => { showToast('Announcement deleted.', 'success'); navigate('announcements'); })
      .catch(err => showToast('Delete failed: ' + err.message, 'error'));
  });

  $(document).on('click', '.promo-view-btn', function() { navigate('promo-detail', $(this).data('id')); });
  $(document).on('click', '.promo-delete-btn', function() {
    const id = $(this).data('id');
    if (!confirm('Delete this promo?')) return;
    Api.del(`/promos/${id}`).then(() => { showToast('Promo deleted.', 'success'); navigate('promos'); })
      .catch(err => showToast('Delete failed: ' + err.message, 'error'));
  });

  $(document).on('click', '.notification-delete-btn', function() {
    const id = $(this).data('id');
    if (!confirm('Delete this notification?')) return;
    Api.del(`/notifications/${id}`).then(() => { showToast('Notification deleted.', 'success'); loadNotifications(); })
      .catch(err => showToast('Delete failed: ' + err.message, 'error'));
  });

  $(document).on('click', '.user-toggle-btn', function() {
    const id = $(this).data('id');
    const action = $(this).data('action');
    const endpoint = action === 'enable' ? 'enable' : 'disable';
    if (!confirm(`${action === 'enable' ? 'Enable' : 'Disable'} this user?`)) return;
    Api.patch(`/users/${id}/${endpoint}`, {})
      .then(() => { showToast(`User ${action}d.`, 'success'); loadUsers(); })
      .catch(err => showToast('Action failed: ' + err.message, 'error'));
  });

  $(document).on('click', '.registration-cancel-btn', function() {
    const id = $(this).data('event-id');
    if (!confirm('Cancel this registration?')) return;
    Api.post('/event-registrations/cancel', { event_id: id })
      .then(() => { showToast('Registration cancelled.', 'success'); loadRegistrations(); })
      .catch(err => showToast('Cancel failed: ' + err.message, 'error'));
  });

  $('#profile-form').on('submit', function(e) {
    e.preventDefault();
    const name = $('#pf-name').val().trim();
    const email = $('#pf-email').val().trim();
    if (!name || !email) { showToast('Please fill in all fields.', 'warning'); return; }
    Api.patch('/users/profile/me', { full_name: name, email })
      .then(() => {
        showToast('Profile updated!', 'success');
        return Api.get('/users/profile/me');
      })
      .then(data => {
        const auth = Auth.getAuth();
        if (auth) { auth.user = data; Auth.setAuth(auth); }
        loadProfile();
      })
      .catch(err => showToast('Update failed: ' + err.message, 'error'));
  });

  $('#events-create-btn').on('click', () => navigate('event-form'));
  $('#announcements-create-btn').on('click', () => navigate('announcement-form'));
  $('#promos-create-btn').on('click', () => navigate('promo-form'));

  $('#announcement-form').on('submit', function(e) {
    e.preventDefault();
    const formData = new FormData();
    formData.append('title', $('#af-title').val().trim());
    formData.append('published', $('#af-published').is(':checked') ? 'true' : 'false');
    const file = $('#af-audio')[0].files[0];
    if (!file) { showToast('Please select an audio file.', 'warning'); return; }
    formData.append('audio', file);
    Api.upload('/announcements', formData)
      .then(() => { showToast('Announcement created!', 'success'); navigate('announcements'); })
      .catch(err => showToast('Failed: ' + err.message, 'error'));
  });

  $('#promo-form').on('submit', function(e) {
    e.preventDefault();
    const formData = new FormData();
    formData.append('title', $('#pf-title').val().trim());
    formData.append('description', $('#pf-desc').val().trim());
    formData.append('caption_text', $('#pf-caption').val().trim());
    formData.append('published', $('#pf-published').is(':checked') ? 'true' : 'false');
    const file = $('#pf-video')[0].files[0];
    if (!file) { showToast('Please select a video file.', 'warning'); return; }
    formData.append('video', file);
    Api.upload('/promos', formData)
      .then(() => { showToast('Promo created!', 'success'); navigate('promos'); })
      .catch(err => showToast('Failed: ' + err.message, 'error'));
  });

  $('#bell-btn').on('click', function() { navigate('notifications'); });
  $('#events-refresh').on('click', () => loadEvents());

  $('#events-filter-apply').on('click', function() {
    const search = $('#events-filter-search').val().trim();
    const date = $('#events-filter-date').val();
    const location = $('#events-filter-location').val().trim();
    const filters = {};
    if (search) filters.search = search;
    if (date) filters.date = date;
    if (location) filters.location = location;
    loadEvents(filters);
  });
  $('#events-filter-clear').on('click', function() {
    $('#events-filter-search').val('');
    $('#events-filter-date').val('');
    $('#events-filter-location').val('');
    loadEvents();
  });

  // ---- Init ----
  const auth = Auth.getAuth();
  if (auth) {
    Api.setToken(auth.token);
    Api.get('/users/profile/me')
      .then(() => navigate('events'))
      .catch(() => { Auth.clear(); navigate('login'); });
  } else {
    navigate('login');
  }

  // Close dropdown on outside click
  $(document).on('click', function(e) {
    if (!$(e.target).closest('#profile-dropdown').length) {
      $('#dropdown-menu').addClass('hidden');
    }
  });

}); // end DOM ready