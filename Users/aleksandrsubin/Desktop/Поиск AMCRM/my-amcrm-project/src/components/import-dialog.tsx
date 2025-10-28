
"use client";

import * as React from "react";
import * as XLSX from "xlsx";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type { Supplier, WarehouseCell, MarkupRule, ProductCategory } from "@/lib/types";
import type { ReceivingFormValues } from "@/app/warehouse/page";
import { Download, Upload, CheckCircle2, AlertTriangle, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface ImportDialogProps {
  children: React.ReactNode;
  suppliers: Supplier[];
  warehouseCells: WarehouseCell[];
  markupRules: MarkupRule[];
  productCategories: ProductCategory[];
  onImport: (data: ReceivingFormValues, applyMarkupRules: boolean, createCategories: boolean, importSupplier: boolean, importCell: boolean) => Promise<{ createdCount: number, updatedCount: number, newDocId: string | null }>;
  lastImportId: string | null;
  onDeleteImport: (importId: string) => void;
}

type ImportStep = 'select_file' | 'show_summary';

const requiredColumns = ["Наименование", "Артикул", "Производитель", "Количество", "Закупка"];
const optionalColumns = [
    "Поставщик",
    "Продажа",
    "Ячейка",
    "Категория",
];
const allPossibleColumns = [...requiredColumns, ...optionalColumns];

export function ImportDialog({ children, suppliers, warehouseCells, markupRules, productCategories, onImport, lastImportId, onDeleteImport }: ImportDialogProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [importStep, setImportStep] = React.useState<ImportStep>('select_file');
  const [createdCount, setCreatedCount] = React.useState(0);
  const [updatedCount, setUpdatedCount] = React.useState(0);
  const [applyMarkup, setApplyMarkup] = React.useState(true);
  const [createCategories, setCreateCategories] = React.useState(true);
  const [importSupplier, setImportSupplier] = React.useState(true);
  const [importCell, setImportCell] = React.useState(true);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFile(event.target.files[0]);
    }
  };

  const handleDownloadTemplate = () => {
    const worksheet = XLSX.utils.aoa_to_sheet([allPossibleColumns]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Шаблон");
    XLSX.writeFile(workbook, "import_template.xlsx");
  };

  const resetState = () => {
    setFile(null);
    setImportStep('select_file');
    setCreatedCount(0);
    setUpdatedCount(0);
    setIsProcessing(false);
    setApplyMarkup(true);
    setCreateCategories(true);
    setImportSupplier(true);
    setImportCell(true);
  };
  
  const handleOpenChange = (open: boolean) => {
    if (!open) {
        resetState();
    }
    setIsOpen(open);
  }

  const handleDeleteLastImport = () => {
    if (lastImportId) {
      onDeleteImport(lastImportId);
      resetState();
      setIsOpen(false);
    }
  }

  const handleImport = async () => {
    if (!file) {
      toast({ variant: "destructive", title: "Файл не выбран" });
      return;
    }

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet) as any[];

        if(json.length === 0) {
            toast({ variant: "destructive", title: "Файл пуст", description: "Выбранный файл не содержит данных." });
            setIsProcessing(false);
            return;
        }

        const headers = Object.keys(json[0]);
        const missingColumns = requiredColumns.filter(col => !headers.includes(col));
        if (missingColumns.length > 0) {
            toast({ variant: "destructive", title: "Неверный формат файла", description: `Отсутствуют обязательные столбцы: ${missingColumns.join(', ')}` });
            setIsProcessing(false);
            return;
        }

        const productsToImport = json.map(row => {
          const supplierName = row["Поставщик"];
          const supplier = suppliers.find(s => s.name === supplierName);
          const cellName = row["Ячейка"];
          const cell = warehouseCells.find(c => c.name === cellName);
          const categoryName = row["Категория"];
          const existingCategory = productCategories.find(c => c.name.toLowerCase() === categoryName?.toLowerCase());
          
          return {
            name: String(row["Наименование"] || ""),
            article: String(row["Артикул"] || ""),
            manufacturer: String(row["Производитель"] || ""),
            supplierId: supplier?.id || "",
            purchase: parseFloat(row["Закупка"]) || undefined,
            price: parseFloat(row["Продажа"]) || undefined,
            quantity: parseInt(row["Количество"], 10) || 1,
            warehouseCellId: cell?.id || "",
            // If category exists, use its ID. If not, pass the name to be created.
            categoryId: existingCategory ? existingCategory.id : categoryName,
          };
        });

        const { createdCount, updatedCount, newDocId } = await onImport({ products: productsToImport }, applyMarkup, createCategories, importSupplier, importCell);
        if (newDocId !== undefined) {
            setCreatedCount(createdCount);
            setUpdatedCount(updatedCount);
            setImportStep('show_summary');
        } else {
            // Handle import failure
            toast({ variant: "destructive", title: "Ошибка импорта", description: "Не удалось создать запись о приходе." });
        }
      } catch (error) {
        console.error("Import error: ", error);
        toast({
          variant: "destructive",
          title: "Ошибка импорта",
          description: "Не удалось обработать файл. Убедитесь, что он в правильном формате.",
        });
      } finally {
        setIsProcessing(false);
      }
    };
    reader.onerror = () => {
        setIsProcessing(false);
         toast({
          variant: "destructive",
          title: "Ошибка чтения файла",
        });
    }
    reader.readAsArrayBuffer(file);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        {importStep === 'select_file' && (
            <>
                <DialogHeader>
                  <DialogTitle>Импорт товаров из Excel</DialogTitle>
                  <DialogDescription>
                    Загрузите файл в формате .xlsx или .csv. Обязательными являются столбцы: {requiredColumns.join(', ')}.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Input type="file" accept=".xlsx, .csv" onChange={handleFileChange} />
                  {file && <p className="text-sm text-muted-foreground">Выбранный файл: {file.name}</p>}
                  <div className="flex items-center space-x-2">
                    <Checkbox id="apply-markup" checked={applyMarkup} onCheckedChange={(checked) => setApplyMarkup(checked as boolean)} />
                    <Label htmlFor="apply-markup">Применить правила наценки, если цена продажи не указана</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="create-categories" checked={createCategories} onCheckedChange={(checked) => setCreateCategories(checked as boolean)} />
                    <Label htmlFor="create-categories">Создавать новые категории, если они не найдены</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="import-supplier" checked={importSupplier} onCheckedChange={(checked) => setImportSupplier(checked as boolean)} />
                    <Label htmlFor="import-supplier">Обновлять поставщика для существующих товаров</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="import-cell" checked={importCell} onCheckedChange={(checked) => setImportCell(checked as boolean)} />
                    <Label htmlFor="import-cell">Обновлять ячейку для существующих товаров</Label>
                  </div>
                </div>
                <DialogFooter className="justify-between">
                    <Button variant="outline" onClick={handleDownloadTemplate}>
                        <Download className="mr-2 h-4 w-4" />
                        Скачать шаблон
                    </Button>
                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={() => setIsOpen(false)}>Отмена</Button>
                        <Button onClick={handleImport} disabled={!file || isProcessing}>
                            {isProcessing ? "Обработка..." : "Импортировать"}
                        </Button>
                    </div>
                </DialogFooter>
            </>
        )}
        {importStep === 'show_summary' && (
             <>
                <DialogHeader>
                  <DialogTitle>Импорт завершен</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center justify-center text-center space-y-4 py-8">
                    <CheckCircle2 className="h-16 w-16 text-green-500"/>
                    <div className="space-y-1">
                        <p className="text-lg font-medium">Обработка завершена!</p>
                        <p className="text-sm text-muted-foreground">
                            Создано: <span className="font-bold">{createdCount}</span> новых позиций.
                        </p>
                        <p className="text-sm text-muted-foreground">
                             Обновлено: <span className="font-bold">{updatedCount}</span> существующих позиций.
                        </p>
                    </div>
                </div>
                <DialogFooter className="justify-between">
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Удалить последний импорт
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Это действие необратимо. Весь последний приход ({createdCount} позиций) будет удален со склада. Обновленные товары не будут затронуты.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Отмена</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteLastImport}>Удалить</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    <Button onClick={() => handleOpenChange(false)}>Закрыть</Button>
                </DialogFooter>
            </>
        )}
      </DialogContent>
    </Dialog>
  );
}
