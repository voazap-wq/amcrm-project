'use client';

import * as React from 'react';
import { AppLayout } from '@/app/components/app-layout';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  searchBrands,
  type Brand,
} from '@/ai/flows/get-part-offers-flow';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function RequestsPage() {
  const [article, setArticle] = React.useState('');
  const [brands, setBrands] = React.useState<Brand[]>([]);
  const [isBrandsLoading, setIsBrandsLoading] = React.useState(false);
  const [brandsError, setBrandsError] = React.useState<string | null>(null);

  const handleSearch = async () => {
    if (!article.trim()) return;

    setIsBrandsLoading(true);
    setBrands([]);
    setBrandsError(null);

    try {
      const brandsResult = await searchBrands({ article: article.trim() });
      if (brandsResult.brands.length === 0) {
        setBrandsError('По данному артикулу бренды не найдены.');
      } else {
        setBrands(brandsResult.brands);
      }
    } catch (error: any) {
      console.error('Failed to search brands:', error);
      setBrandsError(
        error.message || 'Произошла неизвестная ошибка при поиске брендов.'
      );
    } finally {
      setIsBrandsLoading(false);
    }
  };

  return (
    <AppLayout pageTitle="Запросы проценки">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Поиск по артикулу</CardTitle>
              <CardDescription>
                Введите артикул детали для поиска предложений у поставщиков.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 items-end">
                <div className="relative flex-grow min-w-[200px]">
                  <Label htmlFor="article-search">Артикул</Label>
                  <Input
                    id="article-search"
                    placeholder="Введите артикул..."
                    value={article}
                    onChange={(e) => setArticle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>

                <Button onClick={handleSearch} disabled={isBrandsLoading}>
                  <Search className="h-4 w-4 mr-2" />
                  {isBrandsLoading ? 'Поиск...' : 'Найти'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {(isBrandsLoading || brandsError || brands.length > 0) && (
            <Card>
                <CardHeader>
                <CardTitle>Найденные бренды</CardTitle>
                </CardHeader>
                <CardContent>
                {isBrandsLoading && <Skeleton className="h-20 w-full" />}
                {brandsError && <p className="text-red-600">{brandsError}</p>}
                {!isBrandsLoading && !brandsError && brands.length > 0 && (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID Бренда</TableHead>
                                <TableHead>Название бренда</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {brands.map((brand) => (
                                <TableRow key={brand.id}>
                                    <TableCell>{brand.id}</TableCell>
                                    <TableCell>{brand.name}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
                </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
