
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Order, Staff, Customer, Category, Brand, ProductRange, AdminNotification, TrocSession } from '../../types';
import { DB_TABLES, DB_SCHEMA } from '../../constants/dbSchema';
import { normalizeStaffRole } from '../../constants/staffRoles';

export const useAdminData = (addNotification?: (n: AdminNotification) => void) => {
    const notify = addNotification ?? (() => {});
    const [orders, setOrders] = useState<Order[]>([]);
    const [staffMembers, setStaffMembers] = useState<Staff[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [brands, setBrands] = useState<Brand[]>([]);
    const [ranges, setRanges] = useState<ProductRange[]>([]);
    const [trocSessions, setTrocSessions] = useState<TrocSession[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchOrders = useCallback(async () => {
        const { data } = await supabase.from(DB_TABLES.ORDERS).select('*').order(DB_SCHEMA.ORDERS.DATE, { ascending: false });
        if (data) {
            const formattedOrders = data.map((o: any) => ({
                id: o[DB_SCHEMA.ORDERS.ID],
                items: Array.isArray(o[DB_SCHEMA.ORDERS.ITEMS]) ? o[DB_SCHEMA.ORDERS.ITEMS] : [],
                total: o[DB_SCHEMA.ORDERS.TOTAL],
                status: o[DB_SCHEMA.ORDERS.STATUS],
                paymentMethod: o[DB_SCHEMA.ORDERS.PAYMENT_METHOD],
                paymentStatus: o[DB_SCHEMA.ORDERS.PAYMENT_STATUS] ?? 'pending',
                discountAmount: Number(o[DB_SCHEMA.ORDERS.DISCOUNT_AMOUNT] ?? 0),
                staffId: o[DB_SCHEMA.ORDERS.STAFF_ID] ?? undefined,
                storeId: o[DB_SCHEMA.ORDERS.STORE_ID] ?? undefined,
                customerName: o[DB_SCHEMA.ORDERS.CUSTOMER_NAME],
                customerEmail: o[DB_SCHEMA.ORDERS.CUSTOMER_EMAIL],
                customerPhone: o[DB_SCHEMA.ORDERS.CUSTOMER_PHONE],
                customerCity: o[DB_SCHEMA.ORDERS.CUSTOMER_CITY],
                deliveryMode: o[DB_SCHEMA.ORDERS.DELIVERY_MODE] || 'delivery',
                createdAt: o[DB_SCHEMA.ORDERS.DATE],
                date: new Date(o[DB_SCHEMA.ORDERS.DATE]).toLocaleDateString('fr-FR')
            }));
            setOrders(formattedOrders);
        }
    }, []);

    const fetchStaff = useCallback(async () => {
        const { data } = await supabase
            .from(DB_TABLES.STAFF)
            .select('id,name,email,role,phone,avatar,store_id,created_at')
            .order(DB_SCHEMA.STAFF.CREATED_AT, { ascending: false });
        if (data) {
            setStaffMembers(
                data.map((row) => ({
                    ...row,
                    role: normalizeStaffRole(row.role),
                })) as Staff[],
            );
        }
    }, []);

    const fetchCustomers = useCallback(async () => {
        const { data } = await supabase.from(DB_TABLES.CUSTOMERS).select('*').order(DB_SCHEMA.CUSTOMERS.TOTAL_SPENT, { ascending: false });
        if (data) setCustomers(data as Customer[]);
    }, []);

    const fetchCategories = useCallback(async () => {
        const { data } = await supabase.from(DB_TABLES.CATEGORIES).select('*').order(DB_SCHEMA.CATEGORIES.NAME, { ascending: true });
        if (data) setCategories(data as Category[]);
    }, []);

    const fetchBrandsAndRanges = useCallback(async () => {
        const { data: brandsData } = await supabase.from(DB_TABLES.BRANDS).select('*').order(DB_SCHEMA.BRANDS.NAME, { ascending: true });
        if (brandsData) setBrands(brandsData as Brand[]);

        const { data: rangesData } = await supabase.from(DB_TABLES.PRODUCT_RANGES).select('*').order(DB_SCHEMA.PRODUCT_RANGES.NAME, { ascending: true });
        if (rangesData) {
            setRanges(
                rangesData.map((r: Record<string, unknown>) => ({
                    id: r[DB_SCHEMA.PRODUCT_RANGES.ID] as string,
                    name: r[DB_SCHEMA.PRODUCT_RANGES.NAME] as string,
                    slug: r[DB_SCHEMA.PRODUCT_RANGES.SLUG] as string,
                    brand_id: r[DB_SCHEMA.PRODUCT_RANGES.BRAND_ID] as string,
                    category: r[DB_SCHEMA.PRODUCT_RANGES.CATEGORY] as string | undefined,
                })),
            );
        }
    }, []);

    const fetchTrocSessions = useCallback(async () => {
        const { data } = await supabase
            .from('troc_sessions')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(500);
        if (data) setTrocSessions(data as TrocSession[]);
    }, []);

    const refreshAll = useCallback(async () => {
        await Promise.all([fetchOrders(), fetchStaff(), fetchCustomers(), fetchCategories(), fetchBrandsAndRanges(), fetchTrocSessions()]);
    }, [fetchOrders, fetchStaff, fetchCustomers, fetchCategories, fetchBrandsAndRanges, fetchTrocSessions]);

    useEffect(() => {
        const init = async () => {
            setIsLoading(true);
            await refreshAll();
            setIsLoading(false);
        };
        init();

        // Configuration Realtime robuste avec DB_TABLES
        const channel = supabase.channel('admin-db-changes')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: DB_TABLES.ORDERS }, (payload) => {
            const newOrder = payload.new as any;
            notify({
                id: crypto.randomUUID(),
                type: 'order',
                title: 'Nouvelle Commande !',
                message: `Commande #${newOrder[DB_SCHEMA.ORDERS.ID] || '???'} reçue. Montant: ${(newOrder[DB_SCHEMA.ORDERS.TOTAL] || 0).toLocaleString()} FCFA`,
                timestamp: new Date(),
                read: false,
                linkToTab: 'orders'
            });
            fetchOrders(); 
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: DB_TABLES.REPAIR_TICKETS }, (payload) => {
            const newTicket = payload.new as any;
            notify({
                id: crypto.randomUUID(),
                type: 'ticket',
                title: 'Nouveau Ticket SAV',
                message: `Ticket #${newTicket[DB_SCHEMA.REPAIR_TICKETS.ID]} créé pour ${newTicket[DB_SCHEMA.REPAIR_TICKETS.PRODUCT_NAME]}.`,
                timestamp: new Date(),
                read: false,
                linkToTab: 'sav'
            });
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'trade_in_requests' }, (payload) => {
            const req = payload.new as any;
            notify({
                id: crypto.randomUUID(),
                type: 'order',
                title: 'Nouvelle Demande Troc !',
                message: `${req.customer_name ?? 'Client'} soumet son ${req.device_brand ?? ''} ${req.device_model ?? ''} pour évaluation.`,
                timestamp: new Date(),
                read: false,
                linkToTab: 'troc'
            });
        })
        .subscribe();

        return () => { 
            supabase.removeChannel(channel); 
        };
    }, [notify, fetchOrders, refreshAll]);

    return {
        orders, setOrders,
        staffMembers, setStaffMembers,
        customers,
        categories, setCategories,
        brands, setBrands,
        ranges, setRanges,
        trocSessions,
        isLoading,
        refreshAll
    };
};
