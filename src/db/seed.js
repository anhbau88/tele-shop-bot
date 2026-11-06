const { db, initDb, addStock } = require('./database');

function seedData() {
  initDb();

  const catCount = db.prepare('SELECT COUNT(*) as count FROM categories').get().count;
  if (catCount > 0) {
    return;
  }

  console.log('🌱 Đang tạo danh mục và sản phẩm mẫu với bảng giá mới nhất...');

  const categories = [
    { name: 'ChatGPT / OpenAI', icon: '🟢', sort_order: 1 },
    { name: 'Google Gemini Pro', icon: '✨', sort_order: 2 },
    { name: 'Claude AI Anthropic', icon: '🧠', sort_order: 3 },
    { name: 'Cursor & Code AI', icon: '💻', sort_order: 4 },
    { name: 'Super Grok / xAI', icon: '🚀', sort_order: 5 },
    { name: 'Design & Media AI', icon: '🎨', sort_order: 6 }
  ];

  const insertCat = db.prepare('INSERT INTO categories (name, icon, sort_order) VALUES (?, ?, ?)');
  const catIds = {};
  for (const cat of categories) {
    const res = insertCat.run(cat.name, cat.icon, cat.sort_order);
    catIds[cat.name] = res.lastInsertRowid;
  }

  const products = [
    // 1. ChatGPT
    {
      cat: 'ChatGPT / OpenAI',
      name: 'ChatGPT Plus 1 Tháng (Dùng chung)',
      price: 135000,
      pricingType: 'MONTHLY',
      desc: 'Tài khoản ChatGPT Plus dùng chung 1-2 người ổn định, đầy đủ GPT-4o, o1, Canvas, DALL-E.',
      warranty: 'Bảo hành full thời gian gói (1 đổi 1)',
      stock: [
        'gpt_share_01@demo.ai|PassShare@123',
        'gpt_share_02@demo.ai|PassShare@123',
        'gpt_share_03@demo.ai|PassShare@123',
        'gpt_share_04@demo.ai|PassShare@123',
        'gpt_share_05@demo.ai|PassShare@123'
      ]
    },
    {
      cat: 'ChatGPT / OpenAI',
      name: 'ChatGPT Plus Nâng Chính Chủ',
      price: 450000,
      pricingType: 'MONTHLY',
      desc: 'Nâng trực tiếp trên email chính chủ của bạn. Dùng riêng tư 100%, bảo lưu lịch sử chat.',
      warranty: 'Bảo hành trọn đời gói đăng ký',
      stock: [
        'KEY-PLUS-INVITE-01-VIP',
        'KEY-PLUS-INVITE-02-VIP',
        'KEY-PLUS-INVITE-03-VIP'
      ]
    },
    {
      cat: 'ChatGPT / OpenAI',
      name: 'ChatGPT OpenAI Free (Kèm Gmail riêng)',
      price: 3000,
      pricingType: 'FIXED',
      desc: 'Tài khoản OpenAI Free tạo sẵn kèm Gmail riêng, chưa add số điện thoại.',
      warranty: 'Bảo hành đăng nhập lần đầu',
      stock: [
        'gpt_free_01@gmail.com|DemoMailPass@1|recovery@mail.com',
        'gpt_free_02@gmail.com|DemoMailPass@2|recovery@mail.com',
        'gpt_free_03@gmail.com|DemoMailPass@3|recovery@mail.com',
        'gpt_free_04@gmail.com|DemoMailPass@4|recovery@mail.com',
        'gpt_free_05@gmail.com|DemoMailPass@5|recovery@mail.com'
      ]
    },

    // 2. Gemini Pro (Theo đúng yêu cầu: 6T = 200k, 12T = 390k, bỏ Gemini Advanced)
    {
      cat: 'Google Gemini Pro',
      name: 'Google Gemini Pro 2.0 (Slot 6 Tháng)',
      price: 200000,
      pricingType: 'FIXED',
      desc: 'Slot gia đình Google One + Gemini Advanced 2.0 Pro / Ultra thời hạn 6 tháng.',
      warranty: 'Bảo hành full thời gian 6 tháng',
      stock: [
        'INVITE-GEMINI-6M-SLOT01',
        'INVITE-GEMINI-6M-SLOT02',
        'INVITE-GEMINI-6M-SLOT03'
      ]
    },
    {
      cat: 'Google Gemini Pro',
      name: 'Google Gemini Pro 2.0 (Slot 12 Tháng / 1 Năm)',
      price: 390000,
      pricingType: 'FIXED',
      desc: 'Slot gia đình Google One 2TB - 5TB + Gemini Advanced 2.0 Pro / Ultra 12 tháng.',
      warranty: 'Bảo hành full thời gian 12 tháng',
      stock: [
        'INVITE-GEMINI-1Y-SLOT01',
        'INVITE-GEMINI-1Y-SLOT02',
        'INVITE-GEMINI-1Y-SLOT03'
      ]
    },

    // 3. Claude AI (Rẻ hơn thị trường 10k)
    {
      cat: 'Claude AI Anthropic',
      name: 'Claude Pro 1 Tháng (Dùng chung)',
      price: 150000,
      pricingType: 'MONTHLY',
      desc: 'Tài khoản Claude Pro dùng chung ổn định, truy cập không giới hạn Claude 3.5 Sonnet & Haiku.',
      warranty: 'Bảo hành 1 đổi 1 full thời gian',
      stock: [
        'claude_share_01@demo.ai|ClaudePass@123',
        'claude_share_02@demo.ai|ClaudePass@123',
        'claude_share_03@demo.ai|ClaudePass@123'
      ]
    },
    {
      cat: 'Claude AI Anthropic',
      name: 'Claude Pro (Tài khoản riêng chính chủ)',
      price: 440000,
      pricingType: 'MONTHLY',
      desc: 'Tài khoản Claude Pro cấp sẵn riêng tư 1 người hoặc nâng chính chủ email của bạn.',
      warranty: 'Bảo hành 1 đổi 1 suốt thời gian gói',
      stock: [
        'claude_solo_01@demo.ai|ClaudeSoloPass@1',
        'claude_solo_02@demo.ai|ClaudeSoloPass@2'
      ]
    },

    // 4. Cursor & Code AI (Rẻ hơn thị trường 10k)
    {
      cat: 'Cursor & Code AI',
      name: 'Cursor Pro Premium (500 Fast Requests)',
      price: 140000,
      pricingType: 'MONTHLY',
      desc: 'Tài khoản Cursor Pro đầy đủ 500 Fast Requests GPT-4o / Claude 3.5 Sonnet.',
      warranty: 'Bảo hành 1 đổi 1',
      stock: [
        'cursor_pro_01@code.ai|CursorPass@123',
        'cursor_pro_02@code.ai|CursorPass@123',
        'cursor_pro_03@code.ai|CursorPass@123'
      ]
    },
    {
      cat: 'Cursor & Code AI',
      name: 'GitHub Copilot Chính Chủ (Gói 1 Năm)',
      price: 210000,
      pricingType: 'FIXED',
      desc: 'Kích hoạt GitHub Copilot trên chính tài khoản GitHub của bạn trong 1 năm.',
      warranty: 'Bảo hành 12 tháng',
      stock: [
        'KEY-COPILOT-1Y-01',
        'KEY-COPILOT-1Y-02'
      ]
    },

    // 5. Super Grok / xAI (Bổ sung đa dạng các gói Super Grok, rẻ hơn thị trường 10k)
    {
      cat: 'Super Grok / xAI',
      name: 'Super Grok 2 (Dùng chung)',
      price: 80000,
      pricingType: 'MONTHLY',
      desc: 'Tài khoản Grok 2 dùng chung tiết kiệm, truy cập mô hình xAI Grok 2 & Grok 2 Mini.',
      warranty: 'Bảo hành 1 đổi 1',
      stock: [
        'grok_share_01|PassGrok@1|Auth2FA',
        'grok_share_02|PassGrok@2|Auth2FA'
      ]
    },
    {
      cat: 'Super Grok / xAI',
      name: 'Super Grok 2 Premium (Cấp sẵn riêng tư)',
      price: 140000,
      pricingType: 'MONTHLY',
      desc: 'Tài khoản riêng biệt 1 người dùng, tích hợp X Premium + Grok 2 không kiểm duyệt hình ảnh.',
      warranty: 'Bảo hành trọn đời gói',
      stock: [
        'grok_solo_01|PassGrokSolo@1|Auth2FA',
        'grok_solo_02|PassGrokSolo@2|Auth2FA'
      ]
    },
    {
      cat: 'Super Grok / xAI',
      name: 'Combo Lập Trình: Grok 2 + Cursor Pro (1 Tháng)',
      price: 220000,
      pricingType: 'FIXED',
      desc: 'Combo hoàn hảo cho Lập trình viên: 1 acc Grok 2 + 1 acc Cursor Pro tốc độ cao.',
      warranty: 'Bảo hành 30 ngày',
      stock: [
        'COMBO-GROK-CURSOR-PACK-01',
        'COMBO-GROK-CURSOR-PACK-02'
      ]
    },
    {
      cat: 'Super Grok / xAI',
      name: 'X Premium + Super Grok 2 (Nâng chính chủ)',
      price: 270000,
      pricingType: 'MONTHLY',
      desc: 'Nâng gói X Premium tích hợp Grok 2 trực tiếp lên tài khoản Twitter/X của bạn.',
      warranty: 'Bảo hành theo thời hạn đăng ký',
      stock: [
        'KEY-UPGRADE-GROK-X-01',
        'KEY-UPGRADE-GROK-X-02'
      ]
    },

    // 6. Design & Media AI (Rẻ hơn thị trường 10k)
    {
      cat: 'Design & Media AI',
      name: 'Capcut Pro Cá Nhân (Không văng, full VIP)',
      price: 35000,
      pricingType: 'MONTHLY',
      desc: 'Tài khoản CapCut Pro cá nhân mở khóa toàn bộ kho hiệu ứng, template và AI Video.',
      warranty: 'Bảo hành 1 đổi 1 suốt thời gian gói',
      stock: [
        'capcut_01@media.com|CapcutPass@1',
        'capcut_02@media.com|CapcutPass@2',
        'capcut_03@media.com|CapcutPass@3'
      ]
    },
    {
      cat: 'Design & Media AI',
      name: 'Canva Pro Nâng Chính Chủ (Gói 1 Năm)',
      price: 49000,
      pricingType: 'FIXED',
      desc: 'Mời vào nhóm bản quyền Canva Pro trên chính email của bạn thời hạn 1 năm.',
      warranty: 'Bảo hành 1 năm',
      stock: [
        'CANVA-INVITE-1Y-01',
        'CANVA-INVITE-1Y-02'
      ]
    },
    {
      cat: 'Design & Media AI',
      name: 'Canva Pro Nâng Chính Chủ (Vĩnh Viễn)',
      price: 89000,
      pricingType: 'FIXED',
      desc: 'Mời vào nhóm bản quyền Canva Pro dùng vĩnh viễn không giới hạn.',
      warranty: 'Bảo hành trọn đời tài khoản',
      stock: [
        'CANVA-INVITE-LIFETIME-01',
        'CANVA-INVITE-LIFETIME-02'
      ]
    }
  ];

  const insertProd = db.prepare(`
    INSERT INTO products (category_id, name, price_vnd, pricing_type, description, warranty_info, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  let pOrder = 1;
  for (const p of products) {
    const catId = catIds[p.cat];
    const res = insertProd.run(catId, p.name, p.price, p.pricingType, p.desc, p.warranty, pOrder++);
    const prodId = res.lastInsertRowid;
    addStock(prodId, p.stock);
  }

  console.log('✅ Khởi tạo dữ liệu mẫu với bảng giá mới thành công!');
}

module.exports = { seedData };
