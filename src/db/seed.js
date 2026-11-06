const { db, initDb, addStock } = require('./database');

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomString(length = 6) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let res = '';
  for (let i = 0; i < length; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
}

/**
 * Sinh danh sách tài khoản / key ảo số lượng lớn theo chuẩn định dạng từng loại sản phẩm
 */
function generateVirtualAccounts(productName, count) {
  const accounts = [];
  const nameLower = productName.toLowerCase();

  for (let i = 1; i <= count; i++) {
    const num = String(getRandomInt(1000, 9999));
    const token = getRandomString(8);

    if (nameLower.includes('dùng chung') && nameLower.includes('chatgpt')) {
      accounts.push(`gpt.share_${num}@fastmail.ai|PlusPass@${num}|2FA: ${token}`);
    } else if (nameLower.includes('chính chủ') && nameLower.includes('chatgpt')) {
      accounts.push(`KEY-OPENAI-PLUS-UPGRADE-${num}-${token}`);
    } else if (nameLower.includes('free') && nameLower.includes('gmail')) {
      accounts.push(`gpt.user${num}@gmail.com|PassGpt#${num}|backup${num}@outlook.com`);
    } else if (nameLower.includes('gemini') && nameLower.includes('6 tháng')) {
      accounts.push(`https://families.google.com/join/invite/GEMINI-6M-${num}-${token}`);
    } else if (nameLower.includes('gemini') && (nameLower.includes('12') || nameLower.includes('1 năm'))) {
      accounts.push(`https://families.google.com/join/invite/GOOGLE-ONE-1Y-${num}-${token}`);
    } else if (nameLower.includes('claude') && nameLower.includes('dùng chung')) {
      accounts.push(`claude.pro_${num}@cloudmail.org|ClaudePass@${num}`);
    } else if (nameLower.includes('claude') && nameLower.includes('riêng')) {
      accounts.push(`claude.solo_${num}@anthropic-vip.com|SonnetPass#${num}`);
    } else if (nameLower.includes('cursor') && nameLower.includes('premium')) {
      accounts.push(`cursor.dev_${num}@codehub.io|DevPass@${num}|FastReq: 500`);
    } else if (nameLower.includes('copilot')) {
      accounts.push(`COPILOT-STUDENT-PRO-1Y-${num}-${token}`);
    } else if (nameLower.includes('grok') && nameLower.includes('dùng chung')) {
      accounts.push(`x_grok_${num}|PassX@${num}|Auth2FA: ${token}`);
    } else if (nameLower.includes('grok') && nameLower.includes('cấp sẵn')) {
      accounts.push(`super_grok_${num}@xmail.com|GrokPass#${num}|Token: ${token}`);
    } else if (nameLower.includes('combo')) {
      accounts.push(`[Grok: grok_cb${num}|Pass123] + [Cursor: cursor_cb${num}|Pass456]`);
    } else if (nameLower.includes('x premium')) {
      accounts.push(`KEY-UPGRADE-X-PREMIUM-GROK-${num}-${token}`);
    } else if (nameLower.includes('capcut')) {
      accounts.push(`capcut.vip_${num}@media-net.vn|CapcutPass@${num}`);
    } else if (nameLower.includes('canva') && nameLower.includes('1 năm')) {
      accounts.push(`https://www.canva.com/brand/join?invite_token=CANVA-PRO-1Y-${num}-${token}`);
    } else if (nameLower.includes('canva') && nameLower.includes('vĩnh viễn')) {
      accounts.push(`https://www.canva.com/brand/join?invite_token=CANVA-LIFETIME-${num}-${token}`);
    } else {
      accounts.push(`vip.account_${num}@digital-store.com|Pass@${num}`);
    }
  }

  return accounts;
}

function seedData() {
  initDb();

  const categories = [
    { name: 'ChatGPT / OpenAI', icon: '🟢', sort_order: 1 },
    { name: 'Google Gemini Pro', icon: '✨', sort_order: 2 },
    { name: 'Claude AI Anthropic', icon: '🧠', sort_order: 3 },
    { name: 'Cursor & Code AI', icon: '💻', sort_order: 4 },
    { name: 'Super Grok / xAI', icon: '🚀', sort_order: 5 },
    { name: 'Design & Media AI', icon: '🎨', sort_order: 6 }
  ];

  const catCount = db.prepare('SELECT COUNT(*) as count FROM categories').get().count;
  const catIds = {};

  if (catCount === 0) {
    console.log('🌱 Đang tạo danh mục AI lớn...');
    const insertCat = db.prepare('INSERT INTO categories (name, icon, sort_order) VALUES (?, ?, ?)');
    for (const cat of categories) {
      const res = insertCat.run(cat.name, cat.icon, cat.sort_order);
      catIds[cat.name] = res.lastInsertRowid;
    }
  } else {
    const existingCats = db.prepare('SELECT id, name FROM categories').all();
    for (const c of existingCats) {
      catIds[c.name] = c.id;
    }
  }

  // Cấu hình các sản phẩm kèm số lượng tài khoản ảo nạp sẵn vào kho
  const products = [
    // 1. ChatGPT
    {
      cat: 'ChatGPT / OpenAI',
      name: 'ChatGPT Plus 1 Tháng (Dùng chung)',
      price: 135000,
      pricingType: 'MONTHLY',
      desc: 'Tài khoản ChatGPT Plus dùng chung 1-2 người ổn định, đầy đủ GPT-4o, o1, Canvas, DALL-E.',
      warranty: 'Bảo hành full thời gian gói (1 đổi 1)',
      targetStock: 150
    },
    {
      cat: 'ChatGPT / OpenAI',
      name: 'ChatGPT Plus Nâng Chính Chủ',
      price: 450000,
      pricingType: 'MONTHLY',
      desc: 'Nâng trực tiếp trên email chính chủ của bạn. Dùng riêng tư 100%, bảo lưu lịch sử chat.',
      warranty: 'Bảo hành trọn đời gói đăng ký',
      targetStock: 80
    },
    {
      cat: 'ChatGPT / OpenAI',
      name: 'ChatGPT OpenAI Free (Kèm Gmail riêng)',
      price: 3000,
      pricingType: 'FIXED',
      desc: 'Tài khoản OpenAI Free tạo sẵn kèm Gmail riêng, chưa add số điện thoại.',
      warranty: 'Bảo hành đăng nhập lần đầu',
      targetStock: 300
    },

    // 2. Gemini Pro
    {
      cat: 'Google Gemini Pro',
      name: 'Google Gemini Pro 2.0 (Slot 6 Tháng)',
      price: 200000,
      pricingType: 'FIXED',
      desc: 'Slot gia đình Google One + Gemini Advanced 2.0 Pro / Ultra thời hạn 6 tháng.',
      warranty: 'Bảo hành full thời gian 6 tháng',
      targetStock: 100
    },
    {
      cat: 'Google Gemini Pro',
      name: 'Google Gemini Pro 2.0 (Slot 12 Tháng / 1 Năm)',
      price: 390000,
      pricingType: 'FIXED',
      desc: 'Slot gia đình Google One 2TB - 5TB + Gemini Advanced 2.0 Pro / Ultra 12 tháng.',
      warranty: 'Bảo hành full thời gian 12 tháng',
      targetStock: 100
    },

    // 3. Claude AI
    {
      cat: 'Claude AI Anthropic',
      name: 'Claude Pro 1 Tháng (Dùng chung)',
      price: 150000,
      pricingType: 'MONTHLY',
      desc: 'Tài khoản Claude Pro dùng chung ổn định, truy cập không giới hạn Claude 3.5 Sonnet & Haiku.',
      warranty: 'Bảo hành 1 đổi 1 full thời gian',
      targetStock: 120
    },
    {
      cat: 'Claude AI Anthropic',
      name: 'Claude Pro (Tài khoản riêng chính chủ)',
      price: 440000,
      pricingType: 'MONTHLY',
      desc: 'Tài khoản Claude Pro cấp sẵn riêng tư 1 người hoặc nâng chính chủ email của bạn.',
      warranty: 'Bảo hành 1 đổi 1 suốt thời gian gói',
      targetStock: 80
    },

    // 4. Cursor & Code AI
    {
      cat: 'Cursor & Code AI',
      name: 'Cursor Pro Premium (500 Fast Requests)',
      price: 140000,
      pricingType: 'MONTHLY',
      desc: 'Tài khoản Cursor Pro đầy đủ 500 Fast Requests GPT-4o / Claude 3.5 Sonnet.',
      warranty: 'Bảo hành 1 đổi 1',
      targetStock: 150
    },
    {
      cat: 'Cursor & Code AI',
      name: 'GitHub Copilot Chính Chủ (Gói 1 Năm)',
      price: 210000,
      pricingType: 'FIXED',
      desc: 'Kích hoạt GitHub Copilot trên chính tài khoản GitHub của bạn trong 1 năm.',
      warranty: 'Bảo hành 12 tháng',
      targetStock: 80
    },

    // 5. Super Grok
    {
      cat: 'Super Grok / xAI',
      name: 'Super Grok 2 (Dùng chung)',
      price: 80000,
      pricingType: 'MONTHLY',
      desc: 'Tài khoản Grok 2 dùng chung tiết kiệm, truy cập mô hình xAI Grok 2 & Grok 2 Mini.',
      warranty: 'Bảo hành 1 đổi 1',
      targetStock: 120
    },
    {
      cat: 'Super Grok / xAI',
      name: 'Super Grok 2 Premium (Cấp sẵn riêng tư)',
      price: 140000,
      pricingType: 'MONTHLY',
      desc: 'Tài khoản riêng biệt 1 người dùng, tích hợp X Premium + Grok 2 không kiểm duyệt hình ảnh.',
      warranty: 'Bảo hành trọn đời gói',
      targetStock: 80
    },
    {
      cat: 'Super Grok / xAI',
      name: 'Combo Lập Trình: Grok 2 + Cursor Pro (1 Tháng)',
      price: 220000,
      pricingType: 'FIXED',
      desc: 'Combo hoàn hảo cho Lập trình viên: 1 acc Grok 2 + 1 acc Cursor Pro tốc độ cao.',
      warranty: 'Bảo hành 30 ngày',
      targetStock: 60
    },
    {
      cat: 'Super Grok / xAI',
      name: 'X Premium + Super Grok 2 (Nâng chính chủ)',
      price: 270000,
      pricingType: 'MONTHLY',
      desc: 'Nâng gói X Premium tích hợp Grok 2 trực tiếp lên tài khoản Twitter/X của bạn.',
      warranty: 'Bảo hành theo thời hạn đăng ký',
      targetStock: 60
    },

    // 6. Design & Media AI
    {
      cat: 'Design & Media AI',
      name: 'Capcut Pro Cá Nhân (Không văng, full VIP)',
      price: 35000,
      pricingType: 'MONTHLY',
      desc: 'Tài khoản CapCut Pro cá nhân mở khóa toàn bộ kho hiệu ứng, template và AI Video.',
      warranty: 'Bảo hành 1 đổi 1 suốt thời gian gói',
      targetStock: 180
    },
    {
      cat: 'Design & Media AI',
      name: 'Canva Pro Nâng Chính Chủ (Gói 1 Năm)',
      price: 49000,
      pricingType: 'FIXED',
      desc: 'Mời vào nhóm bản quyền Canva Pro trên chính email của bạn thời hạn 1 năm.',
      warranty: 'Bảo hành 1 năm',
      targetStock: 200
    },
    {
      cat: 'Design & Media AI',
      name: 'Canva Pro Nâng Chính Chủ (Vĩnh Viễn)',
      price: 89000,
      pricingType: 'FIXED',
      desc: 'Mời vào nhóm bản quyền Canva Pro dùng vĩnh viễn không giới hạn.',
      warranty: 'Bảo hành trọn đời tài khoản',
      targetStock: 200
    }
  ];

  let pOrder = 1;
  for (const p of products) {
    const catId = catIds[p.cat];
    let existingProd = db.prepare('SELECT id FROM products WHERE name = ?').get(p.name);
    let prodId = null;

    if (!existingProd) {
      const res = db.prepare(`
        INSERT INTO products (category_id, name, price_vnd, pricing_type, description, warranty_info, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(catId, p.name, p.price, p.pricingType, p.desc, p.warranty, pOrder++);
      prodId = res.lastInsertRowid;
    } else {
      prodId = existingProd.id;
    }

    // Đếm tồn kho hiện tại
    const currentStock = db.prepare(`
      SELECT COUNT(*) as count FROM stock_items WHERE product_id = ? AND is_sold = 0
    `).get(prodId).count;

    // Nếu tồn kho còn ít (< targetStock), tự động sinh thêm cho đầy ắp kho
    if (currentStock < p.targetStock) {
      const needed = p.targetStock - currentStock;
      const virtualAccs = generateVirtualAccounts(p.name, needed);
      addStock(prodId, virtualAccs);
    }
  }

  const totalStock = db.prepare('SELECT COUNT(*) as count FROM stock_items WHERE is_sold = 0').get().count;
  console.log(`✅ Kho hàng đã được nạp đầy ắp: TỔNG CỘNG ${totalStock} TÀI KHOẢN VÀ KEY KHẢ DỤNG!`);
}

module.exports = { seedData };
