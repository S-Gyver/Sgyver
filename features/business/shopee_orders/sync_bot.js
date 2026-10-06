/**
 * S-Gyver Cloud Order Sync Bot
 * Standalone Node.js script for syncing orders to Supabase
 * Works in GitHub Actions, Cloud Servers, or Local Machine (Zero-Dependency)
 */

const fs = require('fs');
const path = require('path');

// 1. Credentials (from Environment Variables or Defaults)
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://igiihteeeprpcxxlldkd.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlnaWlodGVlZXBycGN4eGxsZGtkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5ODkwNzksImV4cCI6MjEwMDU2NTA3OX0.fr8_ZAYKQ3D-JgEtAWGJnNvKjoUmYxs1T7tjzzsEltw';

console.log('🤖 [S-Gyver Sync Bot] Initializing...');
console.log('📡 Supabase URL:', SUPABASE_URL);

/**
 * Upsert orders array into Supabase table 'ecommerce_orders'
 */
async function pushOrdersToSupabase(orders) {
    if (!orders || orders.length === 0) {
        console.log('ℹ️ No orders to sync.');
        return;
    }

    console.log(`📤 Sending ${orders.length} orders to Supabase...`);

    const endpoint = `${SUPABASE_URL}/rest/v1/ecommerce_orders`;
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Accept-Profile': 'public',
            'Content-Profile': 'public',
            'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(orders)
    });

    if (response.ok) {
        console.log(`✅ [Success] Successfully synced ${orders.length} orders to Supabase!`);
    } else {
        const errText = await response.text();
        console.error(`❌ [Error] Supabase API responded with status ${response.status}:`, errText);
    }
}

/**
 * Main execution
 */
async function main() {
    console.log('🚀 [S-Gyver Sync Bot] Run complete.');
}

if (require.main === module) {
    main().catch(err => {
        console.error('Fatal Bot Error:', err);
        process.exit(1);
    });
}

module.exports = { pushOrdersToSupabase };
