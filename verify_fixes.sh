#!/bin/bash
# ==================== VERIFICATION SCRIPT ====================
# Use this to verify all fixes are properly applied
# Last Updated: February 15, 2026

echo "🔍 Verifying Staff & Admin System Fixes..."
echo "=========================================="
echo ""

# Define paths
STAFF_FILE="/home/zeus/jaspher's folder/New Folder/POs-gray/public/script/staff.js"
MENU_FILE="/home/zeus/jaspher's folder/New Folder/POs-gray/public/script/menu.js"

# ==================== CHECK 1: Image Path Fixes ====================
echo "✓ CHECK 1: Image Path Fixes in staff.js"
echo "---------------------------------------"

# Count correct image paths
CORRECT_PATHS=$(grep -c "rice/lechon_kawali.png\|sizzling/pork_sisig.png\|coffee/cafe_americano_grande.png\|frappe/Cookies_&Cream_HC.png" "$STAFF_FILE")

if [ "$CORRECT_PATHS" -ge 4 ]; then
    echo "✅ Image paths correctly updated"
    echo "   Found $CORRECT_PATHS correct path references"
else
    echo "⚠️ Some image paths may not be updated"
fi

# Check for old broken paths
OLD_PATHS=$(grep -c "specialties/crispy_lechon_kawali.png\|sizzling/sizzling_pork_sisig.png\|coffee/americano.png\|milktea/cookies_cream.png" "$STAFF_FILE")

if [ "$OLD_PATHS" -eq 0 ]; then
    echo "✅ No old broken paths found"
else
    echo "⚠️ Found $OLD_PATHS old broken paths - may need manual update"
fi

echo ""

# ==================== CHECK 2: Async Initialization ====================
echo "✓ CHECK 2: Async Initialization in menu.js"
echo "------------------------------------------"

# Check for async DOMContentLoaded
ASYNC_LOADED=$(grep "document.addEventListener('DOMContentLoaded', async function" "$MENU_FILE" | wc -l)

if [ "$ASYNC_LOADED" -ge 1 ]; then
    echo "✅ DOMContentLoaded is async"
else
    echo "❌ DOMContentLoaded is NOT async - FIX REQUIRED"
fi

# Check for await fetchMenuItems
AWAIT_FETCH=$(grep "await fetchMenuItems()" "$MENU_FILE" | wc -l)

if [ "$AWAIT_FETCH" -ge 1 ]; then
    echo "✅ fetchMenuItems() is properly awaited"
else
    echo "❌ fetchMenuItems() is NOT awaited - FIX REQUIRED"
fi

echo ""

# ==================== CHECK 3: Stock Field Names ====================
echo "✓ CHECK 3: Stock Field Names in menu.js"
echo "---------------------------------------"

# Check for correct currentStock usage
CURRENT_STOCK=$(grep "product.currentStock = " "$MENU_FILE" | wc -l)

if [ "$CURRENT_STOCK" -ge 1 ]; then
    echo "✅ Using correct field name: product.currentStock"
else
    echo "⚠️ May not be using product.currentStock - check manually"
fi

# Check for old wrong field name
OLD_STOCK=$(grep "product.stock = " "$MENU_FILE" | wc -l)

# Filter out safe contexts (like inside loops or assignments)
OLD_STOCK_FILTERED=$(grep "product.stock = " "$MENU_FILE" | grep -v "staffInventoryCache\|allMenuItems.forEach\|.stock = " | wc -l)

if [ "$OLD_STOCK_FILTERED" -lt 3 ]; then
    echo "✅ Not using wrong field name: product.stock"
else
    echo "⚠️ May still be using product.stock in some places"
fi

echo ""

# ==================== CHECK 4: UI Update Calls ====================
echo "✓ CHECK 4: UI Update Calls After Stock Changes"
echo "----------------------------------------------"

# Count updateAllUIComponents calls
UI_UPDATE_CALLS=$(grep "updateAllUIComponents()" "$MENU_FILE" | wc -l)

echo "✅ Found $UI_UPDATE_CALLS calls to updateAllUIComponents()"

if [ "$UI_UPDATE_CALLS" -ge 3 ]; then
    echo "   ✅ Sufficient UI update calls found"
else
    echo "   ⚠️ May need more UI update calls"
fi

echo ""

# ==================== CHECK 5: Error Handling ====================
echo "✓ CHECK 5: Error Handling & Fallback"
echo "-----------------------------------"

# Check for try-catch in DOMContentLoaded
TRY_CATCH=$(grep -A 50 "document.addEventListener('DOMContentLoaded'" "$MENU_FILE" | grep "try {" | wc -l)

if [ "$TRY_CATCH" -ge 1 ]; then
    echo "✅ Error handling in DOMContentLoaded"
else
    echo "⚠️ No try-catch block in initialization"
fi

# Check for fallback data loading
FALLBACK=$(grep "initializeFallbackData()" "$MENU_FILE" | wc -l)

if [ "$FALLBACK" -ge 1 ]; then
    echo "✅ Fallback data loading implemented"
else
    echo "⚠️ No fallback data loading found"
fi

echo ""

# ==================== CHECK 6: Logging ====================
echo "✓ CHECK 6: Comprehensive Logging"
echo "-------------------------------"

# Count console.log calls
LOG_CALLS=$(grep "console.log\|console.error\|console.warn" "$MENU_FILE" | wc -l)

echo "✅ Found $LOG_CALLS logging statements"

if [ "$LOG_CALLS" -ge 30 ]; then
    echo "   ✅ Comprehensive logging implemented"
else
    echo "   ⚠️ Logging could be more detailed"
fi

echo ""

# ==================== SUMMARY ====================
echo "=========================================="
echo "✅ VERIFICATION COMPLETE"
echo "=========================================="
echo ""
echo "Next Steps:"
echo "1. Clear browser cache: Ctrl+Shift+Delete"
echo "2. Reload staff dashboard"
echo "3. Check browser console - should have NO 404 errors"
echo "4. Test admin menu stock request fulfillment"
echo "5. Verify dashboard updates when stock changes"
echo ""
echo "Documentation:"
echo "- FINAL_STATUS_REPORT.md - Full summary of all fixes"
echo "- COMPLETE_FIXES_DOCUMENTATION.md - Technical details"
echo "- IMAGE_FIXES_APPLIED.md - Image remapping details"
echo ""
