-- Index des clés étrangères et des filtres fréquents.
-- PostgreSQL n'indexe pas automatiquement les clés étrangères : sans ces index,
-- les listes (commandes d'un client, lignes d'un panier, produits d'un vendeur…)
-- parcourent la table entière.

CREATE INDEX IF NOT EXISTS "VendeurDocument_vendeurId_idx" ON "VendeurDocument"("vendeurId");
CREATE INDEX IF NOT EXISTS "Category_vendeurId_idx" ON "Category"("vendeurId");
CREATE INDEX IF NOT EXISTS "Product_vendeurId_idx" ON "Product"("vendeurId");
CREATE INDEX IF NOT EXISTS "Product_categoryId_idx" ON "Product"("categoryId");
CREATE INDEX IF NOT EXISTS "Product_actif_createdAt_idx" ON "Product"("actif", "createdAt");
CREATE INDEX IF NOT EXISTS "ProductVariant_productId_idx" ON "ProductVariant"("productId");
CREATE INDEX IF NOT EXISTS "VariantOption_variantId_idx" ON "VariantOption"("variantId");
CREATE INDEX IF NOT EXISTS "Paiement_abonnementId_idx" ON "Paiement"("abonnementId");
CREATE INDEX IF NOT EXISTS "CartItem_cartId_idx" ON "CartItem"("cartId");
CREATE INDEX IF NOT EXISTS "CartItem_productId_idx" ON "CartItem"("productId");
CREATE INDEX IF NOT EXISTS "Favorite_productId_idx" ON "Favorite"("productId");
CREATE INDEX IF NOT EXISTS "Order_userId_idx" ON "Order"("userId");
CREATE INDEX IF NOT EXISTS "Order_groupeId_idx" ON "Order"("groupeId");
CREATE INDEX IF NOT EXISTS "Order_statut_createdAt_idx" ON "Order"("statut", "createdAt");
CREATE INDEX IF NOT EXISTS "OrderItem_orderId_idx" ON "OrderItem"("orderId");
CREATE INDEX IF NOT EXISTS "OrderItem_productId_idx" ON "OrderItem"("productId");
CREATE INDEX IF NOT EXISTS "ResetToken_userId_idx" ON "ResetToken"("userId");
CREATE INDEX IF NOT EXISTS "OtpToken_identifiant_idx" ON "OtpToken"("identifiant");
