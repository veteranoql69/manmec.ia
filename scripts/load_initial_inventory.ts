import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('📦 Iniciando carga de Inventario Físico Inicial...');

  // 1. Obtener automáticamente la Bodega Central y un Usuario Admin
  const centralWarehouse = await prisma.manmecWarehouse.findFirst({
    where: { name: { contains: 'Central', mode: 'insensitive' }, vehicle_id: null }
  });

  const adminUser = await prisma.manmecUser.findFirst({
    where: { role: 'COMPANY_ADMIN' }
  });

  if (!centralWarehouse) throw new Error('❌ No se encontró la Bodega Central en la BD.');
  if (!adminUser) throw new Error('❌ No se encontró un usuario administrador.');

  // 2. Leer archivo CSV
  const csvPath = path.join(__dirname, '../inventario_inicial.csv');
  if (!fs.existsSync(csvPath)) {
    throw new Error(`❌ No se encontró el archivo CSV en: ${csvPath}\nPor favor pega el archivo CSV en la raíz del proyecto antes de continuar.`);
  }

  const csvContent = fs.readFileSync(csvPath, 'utf8');
  // Separar por salto de línea y limpiar
  const lines = csvContent.split('\n').map(line => line.trim()).filter(line => line !== '');

  // Si la primera línea es la cabecera "SKU,CANTIDAD", la ignoramos
  if (lines[0].toUpperCase().includes('SKU')) {
    lines.shift();
  }

  const movements = [];
  const notFoundSkus = [];

  // 3. Procesar cada línea del CSV
  for (const line of lines) {
    const [skuStr, qtyStr] = line.split(',');
    if (!skuStr || !qtyStr) continue;

    const sku = skuStr.trim();
    const quantity = parseFloat(qtyStr.trim());

    if (isNaN(quantity) || quantity <= 0) continue;

    // Validar si el SKU existe (buscando tanto en sku como en barcode por seguridad)
    const item = await prisma.manmecInventoryItem.findFirst({
      where: {
        OR: [
          { sku: sku },
          { barcode: sku }
        ]
      }
    });

    if (item) {
      movements.push({
        item_id: item.id,
        warehouse_id: centralWarehouse.id,
        user_id: adminUser.id,
        type: 'IN', // Tipo de movimiento
        quantity: quantity,
        reason: 'insercion de inventario inicial' // Trazabilidad requerida
      });
    } else {
      // Registrar SKUs que auditoría mandó pero no existen en DB
      notFoundSkus.push(sku);
    }
  }

  // 4. Reporte de advertencias (SKUs no encontrados)
  if (notFoundSkus.length > 0) {
    console.warn('\n⚠️ ATENCIÓN: Los siguientes SKUs del CSV no existen en la BD y serán ignorados:');
    console.warn(notFoundSkus.join(', '));
  }

  // 5. Inserción Masiva
  if (movements.length > 0) {
    console.log(`\n⏳ Procediendo a insertar ${movements.length} registros...`);

    const result = await prisma.manmecInventoryMovement.createMany({
      data: movements as any
    });

    console.log(`✅ ¡Éxito! Se insertaron ${result.count} ingresos a la Bodega Central.`);
    console.log(`Los triggers automáticos han actualizado el stock real en la tabla manmec_inventory_stock.`);
  } else {
    console.log('\n❌ No se encontraron movimientos válidos para insertar.');
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
