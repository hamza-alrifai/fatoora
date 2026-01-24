import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/layout/PageHeader';
import { Plus, Loader2, Save, Trash2, Package, Search, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import type { Product } from '@/types';
import { cn } from '@/lib/utils';

export function ProductWorkspace() {
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadProducts();
    }, []);

    const loadProducts = async () => {
        setIsLoading(true);
        console.log('Loading products...');
        const result = await window.electron.getProducts();
        console.log('Get products result:', result);

        if (result.success && result.products) {
            console.log('Products loaded:', result.products.length);
            // Auto-seed default products if list is empty
            if (result.products.length === 0) {
                console.log('No products found, seeding defaults...');
                await seedDefaultProducts();
                const res2 = await window.electron.getProducts();
                console.log('After seeding, products:', res2);
                if (res2.success && res2.products) {
                    setProducts(res2.products);
                }
            } else {
                setProducts(result.products);
            }
        } else {
            console.error('Failed to load products:', result.error);
            toast.error('Failed to load products');
        }
        setIsLoading(false);
    };

    const seedDefaultProducts = async () => {
        const defaults: Partial<Product>[] = [
            { name: '20mm Gabbro', description: 'Gabbro aggregate 20mm', rate: 0, type: '20mm' },
            { name: '10mm Gabbro', description: 'Gabbro aggregate 10mm', rate: 0, type: '10mm' },
        ];

        console.log('Seeding default products...');
        for (const p of defaults) {
            const result = await window.electron.saveProduct(p as Product);
            console.log('Save result:', result);
            if (!result.success) {
                toast.error(`Failed to create ${p.name}: ${result.error}`);
                return;
            }
        }
        console.log('Default products created successfully');
        toast.success('Default products created', { description: 'Set your rates for 10mm and 20mm Gabbro.' });
    };

    const handleCreateNew = () => {
        const newProduct: Product = {
            id: '',
            name: 'New Product',
            description: '',
            rate: 0,
            type: 'other',
            createdAt: '',
            updatedAt: ''
        };
        setSelectedProduct(newProduct);
    };

    const handleSave = async (product: Product) => {
        if (!product.name.trim()) {
            toast.error('Product name is required');
            return;
        }
        const result = await window.electron.saveProduct(product);
        if (result.success) {
            toast.success('Product saved');
            await loadProducts();
            if (result.id && !product.id) {
                setSelectedProduct({ ...product, id: result.id });
            }
        } else {
            toast.error(result.error || 'Failed to save');
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure? This cannot be undone.')) {
            const result = await window.electron.deleteProduct(id);
            if (result.success) {
                toast.success('Product deleted');
                loadProducts();
                setSelectedProduct(null);
            } else {
                toast.error(result.error);
            }
        }
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getTypeColor = (type: string) => {
        if (type === '20mm') return 'bg-primary/20 text-primary';
        if (type === '10mm') return 'bg-slate-400/20 text-slate-400';
        return 'bg-secondary text-muted-foreground';
    };

    return (
        <div className="flex h-full bg-background/50 overflow-hidden relative">
            {/* Sidebar List */}
            <div className="w-80 border-r border-border/40 bg-card/30 backdrop-blur-sm flex flex-col">
                <div className="p-4 space-y-4 border-b border-border/40">
                    <div className="flex items-center justify-between">
                        <h2 className="font-semibold text-lg tracking-tight">Products</h2>
                        <Button size="icon" variant="ghost" onClick={handleCreateNew} className="h-8 w-8">
                            <Plus className="w-5 h-5" />
                        </Button>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search products..."
                            className="pl-9 bg-secondary/50 border-transparent focus:border-primary/20"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    {/* Debug info */}
                    <div className="text-xs text-muted-foreground px-2">
                        Total: {products.length} | Filtered: {filteredProducts.length}
                    </div>
                </div>

                <div className="flex-1 overflow-auto p-3 space-y-2">
                    {isLoading ? (
                        <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>
                    ) : filteredProducts.length > 0 ? (
                        filteredProducts.map(p => (
                            <div
                                key={p.id}
                                onClick={() => setSelectedProduct(p)}
                                className={cn(
                                    "p-3 rounded-xl cursor-pointer border transition-all duration-200 group relative overflow-hidden",
                                    selectedProduct?.id === p.id
                                        ? "bg-primary/10 border-primary/50 shadow-sm"
                                        : "bg-card/50 border-transparent hover:bg-secondary/50"
                                )}
                            >
                                {selectedProduct?.id === p.id && (
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                                )}
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                                        getTypeColor(p.type)
                                    )}>
                                        <Package className="w-5 h-5" />
                                    </div>
                                    <div className="overflow-hidden flex-1">
                                        <h3 className={cn("text-sm font-medium truncate", selectedProduct?.id === p.id ? "text-primary" : "text-foreground")}>{p.name}</h3>
                                        <p className="text-xs text-muted-foreground truncate opacity-80">
                                            {p.rate > 0 ? `QAR ${p.rate.toLocaleString()}` : 'No rate set'}
                                        </p>
                                    </div>
                                    <span className={cn(
                                        "px-2 py-0.5 rounded-full text-[10px] font-medium uppercase",
                                        getTypeColor(p.type)
                                    )}>
                                        {p.type}
                                    </span>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
                            <Package className="w-12 h-12 text-muted-foreground/30" />
                            <div>
                                <h3 className="text-sm font-medium">No products yet</h3>
                                <p className="text-xs text-muted-foreground">Create default Gabbro products</p>
                            </div>
                            <Button size="sm" onClick={async () => {
                                await seedDefaultProducts();
                                await loadProducts();
                            }}>
                                <Plus className="w-4 h-4 mr-2" />
                                Create Defaults
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-auto p-8">
                {selectedProduct ? (
                    <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <PageHeader
                            title={selectedProduct.name || 'New Product'}
                            description={selectedProduct.type !== 'other' ? `${selectedProduct.type} Gabbro` : 'Custom product'}
                        >
                            {selectedProduct.id && (
                                <Button variant="destructive" size="sm" onClick={() => handleDelete(selectedProduct.id)}>
                                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                                </Button>
                            )}
                            <Button onClick={() => handleSave(selectedProduct)} className="bg-primary hover:bg-primary/90">
                                <Save className="w-4 h-4 mr-2" /> Save Changes
                            </Button>
                        </PageHeader>

                        <div className="grid gap-6 mt-6">
                            <Card className="border-white/5 bg-card/40 backdrop-blur-md">
                                <CardHeader>
                                    <CardTitle className="text-md flex items-center gap-2">
                                        <Package className="w-4 h-4 text-primary" />
                                        Product Details
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-muted-foreground">Name</label>
                                        <Input
                                            value={selectedProduct.name}
                                            onChange={(e) => setSelectedProduct({ ...selectedProduct, name: e.target.value })}
                                            className="bg-transparent"
                                            placeholder="Product name"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-muted-foreground">Description</label>
                                        <Input
                                            value={selectedProduct.description || ''}
                                            onChange={(e) => setSelectedProduct({ ...selectedProduct, description: e.target.value })}
                                            className="bg-transparent"
                                            placeholder="Optional description"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-muted-foreground">Type</label>
                                        <select
                                            className="w-full h-10 rounded-md border border-input bg-background/50 px-3 text-sm focus:border-primary"
                                            value={selectedProduct.type}
                                            onChange={(e) => setSelectedProduct({ ...selectedProduct, type: e.target.value as '10mm' | '20mm' | 'other' })}
                                        >
                                            <option value="20mm">20mm Gabbro</option>
                                            <option value="10mm">10mm Gabbro</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-white/5 bg-card/40 backdrop-blur-md">
                                <CardHeader>
                                    <CardTitle className="text-md flex items-center gap-2">
                                        <DollarSign className="w-4 h-4 text-primary" />
                                        Pricing
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Rate per Unit</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-3 text-sm text-muted-foreground">QAR</span>
                                            <Input
                                                type="number"
                                                value={selectedProduct.rate || ''}
                                                onChange={(e) => setSelectedProduct({ ...selectedProduct, rate: parseFloat(e.target.value) || 0 })}
                                                className="font-mono text-xl h-12 bg-transparent pl-14 text-right"
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <p className="text-xs text-muted-foreground pt-2">
                                            This rate will be used as the default when generating invoices.
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-50">
                        <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center">
                            <Package className="w-10 h-10 text-muted-foreground" />
                        </div>
                        <div>
                            <h2 className="text-xl font-medium">No Product Selected</h2>
                            <p className="text-sm text-muted-foreground">Select a product from the sidebar or create a new one.</p>
                        </div>
                        <Button onClick={handleCreateNew} variant="outline">
                            <Plus className="w-4 h-4 mr-2" /> Create Product
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
