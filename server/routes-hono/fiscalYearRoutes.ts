import { Hono } from 'hono';
import type { Context } from 'hono';
import { authenticate } from '../middleware-hono/auth';
import { prisma } from '../lib/prisma';
import { nanoid } from 'nanoid';

const fiscalYears = new Hono();
fiscalYears.use('*', authenticate);

// ==================== الحصول على جميع السنوات المالية ====================
fiscalYears.get('/', async (c: Context) => {
  try {
    const years = await prisma.fiscal_years.findMany({
      orderBy: { startDate: 'desc' },
      include: {
        opening_balances: true,
        closing_entries: true
      }
    });

    return c.json({
      success: true,
      data: years
    });
  } catch (error: any) {
    console.error('Error fetching fiscal years:', error);
    return c.json({
      success: false,
      message: error.message || 'فشل في جلب السنوات المالية'
    }, 500);
  }
});

// ==================== الحصول على السنة المالية الحالية ====================
fiscalYears.get('/current', async (c: Context) => {
  try {
    const currentYear = await prisma.fiscal_years.findFirst({
      where: { isCurrent: true },
      include: {
        opening_balances: true
      }
    });

    if (!currentYear) {
      return c.json({
        success: false,
        message: 'لا توجد سنة مالية حالية'
      }, 404);
    }

    return c.json({
      success: true,
      data: currentYear
    });
  } catch (error: any) {
    console.error('Error fetching current fiscal year:', error);
    return c.json({
      success: false,
      message: error.message || 'فشل في جلب السنة المالية الحالية'
    }, 500);
  }
});

// ==================== الحصول على سنة مالية بواسطة ID ====================
fiscalYears.get('/:id', async (c: Context) => {
  try {
    const id = c.req.param('id');
    
    const year = await prisma.fiscal_years.findUnique({
      where: { id },
      include: {
        opening_balances: true,
        closing_entries: true
      }
    });

    if (!year) {
      return c.json({
        success: false,
        message: 'السنة المالية غير موجودة'
      }, 404);
    }

    return c.json({
      success: true,
      data: year
    });
  } catch (error: any) {
    console.error('Error fetching fiscal year:', error);
    return c.json({
      success: false,
      message: error.message || 'فشل في جلب السنة المالية'
    }, 500);
  }
});

// ==================== إنشاء سنة مالية جديدة ====================
fiscalYears.post('/', async (c: Context) => {
  try {
    const body = await c.req.json();
    const user = c.get('user');
    
    const { name, code, startDate, endDate, isCurrent } = body;

    // التحقق من البيانات المطلوبة
    if (!name || !code || !startDate || !endDate) {
      return c.json({
        success: false,
        message: 'جميع الحقول مطلوبة: name, code, startDate, endDate'
      }, 400);
    }

    // التحقق من عدم وجود كود مكرر
    const existingCode = await prisma.fiscal_years.findUnique({
      where: { code }
    });

    if (existingCode) {
      return c.json({
        success: false,
        message: 'كود السنة المالية موجود مسبقاً'
      }, 400);
    }

    // التحقق من عدم تداخل التواريخ
    const overlapping = await prisma.fiscal_years.findFirst({
      where: {
        OR: [
          {
            AND: [
              { startDate: { lte: new Date(startDate) } },
              { endDate: { gte: new Date(startDate) } }
            ]
          },
          {
            AND: [
              { startDate: { lte: new Date(endDate) } },
              { endDate: { gte: new Date(endDate) } }
            ]
          }
        ]
      }
    });

    if (overlapping) {
      return c.json({
        success: false,
        message: 'تتداخل هذه السنة مع سنة مالية أخرى'
      }, 400);
    }

    // إذا كانت هذه السنة هي الحالية، قم بإلغاء الحالية السابقة
    if (isCurrent) {
      await prisma.fiscal_years.updateMany({
        where: { isCurrent: true },
        data: { isCurrent: false }
      });
    }

    const newYear = await prisma.fiscal_years.create({
      data: {
        id: nanoid(),
        name,
        code,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: 'OPEN',
        isCurrent: isCurrent || false,
        createdById: user?.id
      }
    });

    return c.json({
      success: true,
      message: 'تم إنشاء السنة المالية بنجاح',
      data: newYear
    }, 201);
  } catch (error: any) {
    console.error('Error creating fiscal year:', error);
    return c.json({
      success: false,
      message: error.message || 'فشل في إنشاء السنة المالية'
    }, 500);
  }
});

// ==================== تحديث سنة مالية ====================
fiscalYears.put('/:id', async (c: Context) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    
    const year = await prisma.fiscal_years.findUnique({
      where: { id }
    });

    if (!year) {
      return c.json({
        success: false,
        message: 'السنة المالية غير موجودة'
      }, 404);
    }

    // لا يمكن تعديل سنة مغلقة
    if (year.status === 'CLOSED') {
      return c.json({
        success: false,
        message: 'لا يمكن تعديل سنة مالية مغلقة'
      }, 400);
    }

    // إذا تم تعيينها كحالية، إلغاء الحالية السابقة
    if (body.isCurrent) {
      await prisma.fiscal_years.updateMany({
        where: { isCurrent: true, id: { not: id } },
        data: { isCurrent: false }
      });
    }

    const updated = await prisma.fiscal_years.update({
      where: { id },
      data: {
        name: body.name,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
        isCurrent: body.isCurrent,
        allowBackdatedEntries: body.allowBackdatedEntries,
        lockDate: body.lockDate ? new Date(body.lockDate) : undefined
      }
    });

    return c.json({
      success: true,
      message: 'تم تحديث السنة المالية بنجاح',
      data: updated
    });
  } catch (error: any) {
    console.error('Error updating fiscal year:', error);
    return c.json({
      success: false,
      message: error.message || 'فشل في تحديث السنة المالية'
    }, 500);
  }
});

// ==================== إقفال السنة المالية ====================
fiscalYears.post('/:id/close', async (c: Context) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const user = c.get('user');
    
    const year = await prisma.fiscal_years.findUnique({
      where: { id }
    });

    if (!year) {
      return c.json({
        success: false,
        message: 'السنة المالية غير موجودة'
      }, 404);
    }

    if (year.status === 'CLOSED') {
      return c.json({
        success: false,
        message: 'السنة المالية مغلقة بالفعل'
      }, 400);
    }

    // 1. حساب أرصدة الإيرادات والمصروفات من القيود المرتبطة بهذه السنة فقط
    const revenueBalances = await prisma.$queryRaw`
      SELECT 
        a.id,
        a.code,
        a.name,
        a.type,
        COALESCE(SUM(CASE WHEN je."debitAccountId" = a.id THEN je.amount ELSE 0 END), 0) as debit_total,
        COALESCE(SUM(CASE WHEN je."creditAccountId" = a.id THEN je.amount ELSE 0 END), 0) as credit_total
      FROM accounts a
      LEFT JOIN journal_entries je ON (je."debitAccountId" = a.id OR je."creditAccountId" = a.id) 
        AND je."fiscalYearId" = ${id}
      WHERE a.type = 'REVENUE'
      GROUP BY a.id, a.code, a.name, a.type
    ` as any[];

    const expenseBalances = await prisma.$queryRaw`
      SELECT 
        a.id,
        a.code,
        a.name,
        a.type,
        COALESCE(SUM(CASE WHEN je."debitAccountId" = a.id THEN je.amount ELSE 0 END), 0) as debit_total,
        COALESCE(SUM(CASE WHEN je."creditAccountId" = a.id THEN je.amount ELSE 0 END), 0) as credit_total
      FROM accounts a
      LEFT JOIN journal_entries je ON (je."debitAccountId" = a.id OR je."creditAccountId" = a.id) 
        AND je."fiscalYearId" = ${id}
      WHERE a.type = 'EXPENSE'
      GROUP BY a.id, a.code, a.name, a.type
    ` as any[];

    // 2. حساب صافي الدخل لهذه السنة فقط
    // الإيرادات = Credit - Debit (لأن الإيرادات تزيد بالدائن)
    const totalRevenue = revenueBalances.reduce((sum: number, acc: any) => {
      return sum + (Number(acc.credit_total) - Number(acc.debit_total));
    }, 0);
    
    // المصروفات = Debit - Credit (لأن المصروفات تزيد بالمدين)
    const totalExpenses = expenseBalances.reduce((sum: number, acc: any) => {
      return sum + (Number(acc.debit_total) - Number(acc.credit_total));
    }, 0);
    
    const netIncome = totalRevenue - totalExpenses;

    // 3. إنشاء قيود الإقفال
    const closingEntries: any[] = [];
    const now = new Date();

    // قيد إقفال الإيرادات (من الإيرادات إلى ملخص الدخل)
    for (const account of revenueBalances) {
      const balance = Number(account.credit_total) - Number(account.debit_total);
      if (balance !== 0) {
        const entryId = nanoid();
        closingEntries.push({
          id: entryId,
          fiscalYearId: id,
          entryType: 'REVENUE_CLOSE',
          description: `إقفال حساب الإيرادات: ${account.name}`,
          debitAccountId: account.id,
          creditAccountId: '3200', // حساب ملخص الدخل
          amount: Math.abs(balance),
          createdAt: now
        });
      }
    }

    // قيد إقفال المصروفات (من ملخص الدخل إلى المصروفات)
    for (const account of expenseBalances) {
      const balance = Number(account.debit_total) - Number(account.credit_total);
      if (balance !== 0) {
        const entryId = nanoid();
        closingEntries.push({
          id: entryId,
          fiscalYearId: id,
          entryType: 'EXPENSE_CLOSE',
          description: `إقفال حساب المصروفات: ${account.name}`,
          debitAccountId: '3200', // حساب ملخص الدخل
          creditAccountId: account.id,
          amount: Math.abs(balance),
          createdAt: now
        });
      }
    }

    // قيد تحويل صافي الدخل إلى الأرباح المحتجزة
    if (netIncome !== 0) {
      closingEntries.push({
        id: nanoid(),
        fiscalYearId: id,
        entryType: 'RETAINED_EARNINGS',
        description: 'تحويل صافي الدخل إلى الأرباح المحتجزة',
        debitAccountId: netIncome > 0 ? '3200' : '3100', // ملخص الدخل أو الأرباح المحتجزة
        creditAccountId: netIncome > 0 ? '3100' : '3200', // الأرباح المحتجزة أو ملخص الدخل
        amount: Math.abs(netIncome),
        createdAt: now
      });
    }

    // 4. حفظ قيود الإقفال
    if (closingEntries.length > 0) {
      await prisma.fiscal_year_closing_entries.createMany({
        data: closingEntries
      });
    }

    // 5. تحديث حالة السنة المالية (لا نصفر الحسابات العامة)
    const updatedYear = await prisma.fiscal_years.update({
      where: { id },
      data: {
        status: 'CLOSED',
        closedAt: now,
        closedById: user?.id,
        closingNotes: body.notes || null,
        closingRetainedEarnings: netIncome > 0 ? netIncome : undefined,
        closingNetIncome: netIncome,
        isCurrent: false
      }
    });

    return c.json({
      success: true,
      message: 'تم إقفال السنة المالية بنجاح',
      data: {
        fiscalYear: updatedYear,
        closingEntries: closingEntries.length,
        netIncome,
        totalRevenue,
        totalExpenses
      }
    });
  } catch (error: any) {
    console.error('Error closing fiscal year:', error);
    return c.json({
      success: false,
      message: error.message || 'فشل في إقفال السنة المالية'
    }, 500);
  }
});

// ==================== ترحيل الأرصدة للسنة الجديدة ====================
fiscalYears.post('/:id/carry-forward', async (c: Context) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const user = c.get('user');
    
    const { targetYearId } = body;

    if (!targetYearId) {
      return c.json({
        success: false,
        message: 'يجب تحديد السنة المالية الجديدة للترحيل إليها'
      }, 400);
    }

    // التحقق من السنة المصدر
    const sourceYear = await prisma.fiscal_years.findUnique({
      where: { id }
    });

    if (!sourceYear) {
      return c.json({
        success: false,
        message: 'السنة المالية المصدر غير موجودة'
      }, 404);
    }

    if (sourceYear.status !== 'CLOSED') {
      return c.json({
        success: false,
        message: 'يجب إقفال السنة المالية أولاً قبل ترحيل الأرصدة'
      }, 400);
    }

    // التحقق من السنة الهدف
    const targetYear = await prisma.fiscal_years.findUnique({
      where: { id: targetYearId }
    });

    if (!targetYear) {
      return c.json({
        success: false,
        message: 'السنة المالية الهدف غير موجودة'
      }, 404);
    }

    if (targetYear.status === 'CLOSED') {
      return c.json({
        success: false,
        message: 'لا يمكن الترحيل لسنة مالية مغلقة'
      }, 400);
    }

    // جلب حسابات الأصول والخصوم وحقوق الملكية (الحسابات الدائمة)
    const permanentAccounts = await prisma.accounts.findMany({
      where: {
        type: { in: ['ASSET', 'LIABILITY', 'EQUITY'] }
      }
    });

    // إنشاء أرصدة افتتاحية للسنة الجديدة
    const openingBalances = permanentAccounts
      .filter(acc => acc.balance !== 0 || acc.debitBalance !== 0 || acc.creditBalance !== 0)
      .map(account => ({
        id: nanoid(),
        fiscalYearId: targetYearId,
        accountId: account.id,
        debitBalance: account.debitBalance,
        creditBalance: account.creditBalance,
        balance: account.balance,
        source: 'CARRIED_FORWARD',
        createdById: user?.id
      }));

    // حذف أرصدة افتتاحية سابقة للسنة الهدف إن وجدت
    await prisma.fiscal_year_opening_balances.deleteMany({
      where: { fiscalYearId: targetYearId }
    });

    // إنشاء الأرصدة الافتتاحية الجديدة
    if (openingBalances.length > 0) {
      await prisma.fiscal_year_opening_balances.createMany({
        data: openingBalances
      });
    }

    // تحديث السنة المصدر
    await prisma.fiscal_years.update({
      where: { id },
      data: {
        balancesCarriedForward: true,
        carriedForwardAt: new Date(),
        carriedForwardById: user?.id,
        nextYearId: targetYearId
      }
    });

    // تحديث السنة الهدف
    await prisma.fiscal_years.update({
      where: { id: targetYearId },
      data: {
        previousYearId: id
      }
    });

    return c.json({
      success: true,
      message: 'تم ترحيل الأرصدة بنجاح',
      data: {
        accountsCarried: openingBalances.length,
        sourceYear: sourceYear.name,
        targetYear: targetYear.name
      }
    });
  } catch (error: any) {
    console.error('Error carrying forward balances:', error);
    return c.json({
      success: false,
      message: error.message || 'فشل في ترحيل الأرصدة'
    }, 500);
  }
});

// ==================== فتح سنة مالية جديدة (مبنية على السنة السابقة) ====================
fiscalYears.post('/open-new', async (c: Context) => {
  try {
    const body = await c.req.json();
    const user = c.get('user');
    
    const { basedOnYearId, name, code, startDate, endDate } = body;

    // التحقق من البيانات المطلوبة
    if (!name || !code || !startDate || !endDate) {
      return c.json({
        success: false,
        message: 'جميع الحقول مطلوبة'
      }, 400);
    }

    // التحقق من عدم وجود كود مكرر
    const existingCode = await prisma.fiscal_years.findUnique({
      where: { code }
    });

    if (existingCode) {
      return c.json({
        success: false,
        message: 'كود السنة المالية موجود مسبقاً'
      }, 400);
    }

    // إلغاء السنة الحالية السابقة
    await prisma.fiscal_years.updateMany({
      where: { isCurrent: true },
      data: { isCurrent: false }
    });

    // إنشاء السنة الجديدة
    const newYear = await prisma.fiscal_years.create({
      data: {
        id: nanoid(),
        name,
        code,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: 'OPEN',
        isCurrent: true,
        previousYearId: basedOnYearId || null,
        createdById: user?.id
      }
    });

    // إذا كانت مبنية على سنة سابقة، قم بترحيل الأرصدة تلقائياً
    if (basedOnYearId) {
      const previousYear = await prisma.fiscal_years.findUnique({
        where: { id: basedOnYearId }
      });

      if (previousYear && previousYear.status === 'CLOSED') {
        // جلب الحسابات الدائمة
        const permanentAccounts = await prisma.accounts.findMany({
          where: {
            type: { in: ['ASSET', 'LIABILITY', 'EQUITY'] }
          }
        });

        const openingBalances = permanentAccounts
          .filter(acc => acc.balance !== 0)
          .map(account => ({
            id: nanoid(),
            fiscalYearId: newYear.id,
            accountId: account.id,
            debitBalance: account.debitBalance,
            creditBalance: account.creditBalance,
            balance: account.balance,
            source: 'CARRIED_FORWARD',
            previousYearClosingId: basedOnYearId,
            createdById: user?.id
          }));

        if (openingBalances.length > 0) {
          await prisma.fiscal_year_opening_balances.createMany({
            data: openingBalances
          });
        }

        // تحديث السنة السابقة
        await prisma.fiscal_years.update({
          where: { id: basedOnYearId },
          data: {
            nextYearId: newYear.id,
            balancesCarriedForward: true,
            carriedForwardAt: new Date(),
            carriedForwardById: user?.id
          }
        });
      }
    }

    return c.json({
      success: true,
      message: 'تم فتح السنة المالية الجديدة بنجاح',
      data: newYear
    }, 201);
  } catch (error: any) {
    console.error('Error opening new fiscal year:', error);
    return c.json({
      success: false,
      message: error.message || 'فشل في فتح السنة المالية الجديدة'
    }, 500);
  }
});

// ==================== الحصول على ملخص السنة المالية ====================
fiscalYears.get('/:id/summary', async (c: Context) => {
  try {
    const id = c.req.param('id');
    
    const year = await prisma.fiscal_years.findUnique({
      where: { id },
      include: {
        opening_balances: true,
        closing_entries: true
      }
    });

    if (!year) {
      return c.json({
        success: false,
        message: 'السنة المالية غير موجودة'
      }, 404);
    }

    // جلب إحصائيات القيود للسنة المالية المحددة فقط
    const journalStats = await prisma.journal_entries.aggregate({
      where: {
        date: {
          gte: year.startDate,
          lte: year.endDate
        }
      },
      _count: true,
      _sum: {
        amount: true
      }
    });

    // جلب إحصائيات الحجوزات للسنة المالية المحددة
    const bookingStats = await prisma.bookings.aggregate({
      where: {
        bookingDate: {
          gte: year.startDate,
          lte: year.endDate
        }
      },
      _count: true,
      _sum: {
        saleInAED: true,
        costInAED: true,
        grossProfit: true
      }
    });

    // جلب إحصائيات الفواتير للسنة المالية المحددة
    const invoiceStats = await prisma.invoices.aggregate({
      where: {
        invoiceDate: {
          gte: year.startDate,
          lte: year.endDate
        }
      },
      _count: true,
      _sum: {
        totalAmount: true,
        vatAmount: true
      }
    });

    // حساب أرصدة الحسابات الرئيسية لهذه السنة المالية فقط
    // نجمع أرصدة جميع الحسابات الفرعية تحت كل حساب رئيسي
    const accountBalancesForYear = await prisma.$queryRaw`
      WITH RECURSIVE account_hierarchy AS (
        -- الحسابات الرئيسية (المستوى الأول)
        SELECT id, code, name, "nameAr", type, id as root_id
        FROM accounts
        WHERE "parentId" IS NULL
        UNION ALL
        -- الحسابات الفرعية
        SELECT a.id, a.code, a.name, a."nameAr", a.type, ah.root_id
        FROM accounts a
        INNER JOIN account_hierarchy ah ON a."parentId" = ah.id
      ),
      fiscal_year_entries AS (
        SELECT 
          "debitAccountId" as account_id,
          SUM(amount) as debit_total,
          0::numeric as credit_total
        FROM journal_entries
        WHERE "fiscalYearId" = ${id}
        GROUP BY "debitAccountId"
        UNION ALL
        SELECT 
          "creditAccountId" as account_id,
          0::numeric as debit_total,
          SUM(amount) as credit_total
        FROM journal_entries
        WHERE "fiscalYearId" = ${id}
        GROUP BY "creditAccountId"
      ),
      account_totals AS (
        SELECT 
          ah.root_id,
          SUM(COALESCE(fe.debit_total, 0)) as total_debit,
          SUM(COALESCE(fe.credit_total, 0)) as total_credit
        FROM account_hierarchy ah
        LEFT JOIN fiscal_year_entries fe ON ah.id = fe.account_id
        GROUP BY ah.root_id
      )
      SELECT 
        a.id,
        a.code,
        a.name,
        a."nameAr",
        a.type,
        COALESCE(at.total_debit, 0) as "debitBalance",
        COALESCE(at.total_credit, 0) as "creditBalance",
        CASE 
          WHEN a.type IN ('ASSET', 'EXPENSE') THEN COALESCE(at.total_debit, 0) - COALESCE(at.total_credit, 0)
          ELSE COALESCE(at.total_credit, 0) - COALESCE(at.total_debit, 0)
        END as balance
      FROM accounts a
      LEFT JOIN account_totals at ON a.id = at.root_id
      WHERE a."parentId" IS NULL
      ORDER BY a.code
    ` as any[];

    return c.json({
      success: true,
      data: {
        fiscalYear: year,
        statistics: {
          journalEntries: {
            count: journalStats._count,
            totalAmount: journalStats._sum?.amount || 0
          },
          bookings: {
            count: bookingStats._count,
            totalSales: bookingStats._sum?.saleInAED || 0,
            totalCost: bookingStats._sum?.costInAED || 0,
            grossProfit: bookingStats._sum?.grossProfit || 0
          },
          invoices: {
            count: invoiceStats._count,
            totalAmount: invoiceStats._sum?.totalAmount || 0,
            totalVAT: invoiceStats._sum?.vatAmount || 0
          }
        },
        accountBalances: accountBalancesForYear.map((acc: any) => ({
          id: acc.id,
          code: acc.code,
          name: acc.name,
          nameAr: acc.nameAr,
          type: acc.type,
          debitBalance: Number(acc.debitBalance) || 0,
          creditBalance: Number(acc.creditBalance) || 0,
          balance: Number(acc.balance) || 0
        }))
      }
    });
  } catch (error: any) {
    console.error('Error fetching fiscal year summary:', error);
    return c.json({
      success: false,
      message: error.message || 'فشل في جلب ملخص السنة المالية'
    }, 500);
  }
});

// ==================== حذف سنة مالية ====================
fiscalYears.delete('/:id', async (c: Context) => {
  try {
    const id = c.req.param('id');
    
    const year = await prisma.fiscal_years.findUnique({
      where: { id }
    });

    if (!year) {
      return c.json({
        success: false,
        message: 'السنة المالية غير موجودة'
      }, 404);
    }

    // لا يمكن حذف سنة مغلقة أو حالية
    if (year.status === 'CLOSED') {
      return c.json({
        success: false,
        message: 'لا يمكن حذف سنة مالية مغلقة'
      }, 400);
    }

    if (year.isCurrent) {
      return c.json({
        success: false,
        message: 'لا يمكن حذف السنة المالية الحالية'
      }, 400);
    }

    // حذف الأرصدة الافتتاحية المرتبطة
    await prisma.fiscal_year_opening_balances.deleteMany({
      where: { fiscalYearId: id }
    });

    // حذف السنة المالية
    await prisma.fiscal_years.delete({
      where: { id }
    });

    return c.json({
      success: true,
      message: 'تم حذف السنة المالية بنجاح'
    });
  } catch (error: any) {
    console.error('Error deleting fiscal year:', error);
    return c.json({
      success: false,
      message: error.message || 'فشل في حذف السنة المالية'
    }, 500);
  }
});

// ==================== تعيين سنة كحالية ====================
fiscalYears.post('/:id/set-current', async (c: Context) => {
  try {
    const id = c.req.param('id');
    
    const year = await prisma.fiscal_years.findUnique({
      where: { id }
    });

    if (!year) {
      return c.json({
        success: false,
        message: 'السنة المالية غير موجودة'
      }, 404);
    }

    if (year.status === 'CLOSED') {
      return c.json({
        success: false,
        message: 'لا يمكن تعيين سنة مغلقة كحالية'
      }, 400);
    }

    // إلغاء السنة الحالية السابقة
    await prisma.fiscal_years.updateMany({
      where: { isCurrent: true },
      data: { isCurrent: false }
    });

    // تعيين السنة الجديدة كحالية
    const updated = await prisma.fiscal_years.update({
      where: { id },
      data: { isCurrent: true }
    });

    return c.json({
      success: true,
      message: 'تم تعيين السنة المالية كحالية بنجاح',
      data: updated
    });
  } catch (error: any) {
    console.error('Error setting current fiscal year:', error);
    return c.json({
      success: false,
      message: error.message || 'فشل في تعيين السنة المالية كحالية'
    }, 500);
  }
});

export default fiscalYears;
