
-- Fix: force payment_status to 'pending' on insert
DROP POLICY IF EXISTS "用户可以创建支付记录" ON public.payments;
CREATE POLICY "用户可以创建支付记录"
ON public.payments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND payment_status = 'pending');
