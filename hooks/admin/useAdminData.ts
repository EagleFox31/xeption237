
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Order, Staff, Customer, Category, Brand, ProductRange, AdminNotification } from '../../types';
import { DB_TABLES, DB_SCHEMA } from '../../constants/dbSchema';

export const useAdminData = (addNotification: (n: AdminNotification) => void) => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [staffMembers, setStaffMembers] = useState<Staff[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [brands, setBrands] = useState<Brand[]>([]);
    const [ranges, setRanges] = useState<ProductRange[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchOrders = useCallback(async () => {
        const { data } = await supabase.from(DB_TABLES.ORDERS).select('*').order(DB_SCHEMA.ORDERS.DATE, { ascending: false });
        if (data) {
            const formattedOrders = data.map((o: any) => ({
                id: o[DB_SCHEMA.ORDERS.ID],
                items: o[DB_SCHEMA.ORDERS.ITEMS],
                total: o[DB_SCHEMA.ORDERS.TOTAL],
                status: o[DB_SCHEMA.ORDERS.STATUS],
                paymentMethod: o[DB_SCHEMA.ORDERS.PAYMENT_METHOD], 
                customerName: o[DB_SCHEMA.ORDERS.CUSTOMER_NAME],
                customerEmail: o[DB_SCHEMA.ORDERS.CUSTOMER_EMAIL],
                customerPhone: o[DB_SCHEMA.ORDERS.CUSTOMER_PHONE],
                customerCity: o[DB_SCHEMA.ORDERS.CUSTOMER_CITY],
                deliveryMode: o[DB_SCHEMA.ORDERS.DELIVERY_MODE] || 'delivery',
                date: new Date(o[DB_SCHEMA.ORDERS.DATE]).toLocaleDateString('fr-FR')
            }));
            setOrders(formattedOrders);
        }
    }, []);

    const fetchStaff = useCallback(async () => {
        const { data } = await supabase.from(DB_TABLES.STAFF).select('*').order(DB_SCHEMA.STAFF.CREATED_AT, { ascending: false });
        if (data) setStaffMembers(data as Staff[]);
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
        if (rangesData) setRanges(rangesData as ProductRange[]);
    }, []);

    const refreshAll = useCallback(async () => {
        await Promise.all([fetchOrders(), fetchStaff(), fetchCustomers(), fetchCategories(), fetchBrandsAndRanges()]);
    }, [fetchOrders, fetchStaff, fetchCustomers, fetchCategories, fetchBrandsAndRanges]);

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
            addNotification({
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
            addNotification({
                id: crypto.randomUUID(),
                type: 'ticket',
                title: 'Nouveau Ticket SAV',
                message: `Ticket #${newTicket[DB_SCHEMA.REPAIR_TICKETS.ID]} créé pour ${newTicket[DB_SCHEMA.REPAIR_TICKETS.PRODUCT_NAME]}.`,
                timestamp: new Date(),
                read: false,
                linkToTab: 'sav'
            });
        })
        .subscribe();

        return () => { 
            supabase.removeChannel(channel); 
        };
    }, [addNotification, fetchOrders, refreshAll]);

    return {
        orders, setOrders,
        staffMembers, setStaffMembers,
        customers,
        categories, setCategories,
        brands, setBrands,
        ranges, setRanges,
        isLoading,
        refreshAll
    };
};
