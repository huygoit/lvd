-- CreateTable
CREATE TABLE "Staff" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "departmentId" TEXT,
    "positionId" TEXT,

    CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginAccount" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoginAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "capabilities" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateTable
CREATE TABLE "CompanyProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "taxCode" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "representativeName" TEXT NOT NULL DEFAULT '',
    "representativeTitle" TEXT NOT NULL DEFAULT '',
    "defaultTaxBps" INTEGER NOT NULL DEFAULT 1000,
    "incomeTaxBps" INTEGER,
    "website" TEXT NOT NULL DEFAULT '',
    "officePhone" TEXT NOT NULL DEFAULT '',
    "contactAddress" TEXT NOT NULL DEFAULT '',
    "fieldLine" TEXT NOT NULL DEFAULT '',
    "about" TEXT NOT NULL DEFAULT '',
    "latitude" TEXT NOT NULL DEFAULT '',
    "longitude" TEXT NOT NULL DEFAULT '',
    "mapEmbed" TEXT NOT NULL DEFAULT '',
    "logoName" TEXT NOT NULL DEFAULT '',
    "logoStore" TEXT NOT NULL DEFAULT '',
    "logoKey" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyBankAccount" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "branch" TEXT NOT NULL DEFAULT '',
    "accountNumber" TEXT NOT NULL,
    "accountName" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CompanyBankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyProfileFile" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "store" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyProfileFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodeSequence" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CodeSequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL DEFAULT '',
    "taxCode" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "fax" TEXT NOT NULL DEFAULT '',
    "altPhone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "invoiceName" TEXT NOT NULL DEFAULT '',
    "invoiceTaxCode" TEXT NOT NULL DEFAULT '',
    "invoiceAddress" TEXT NOT NULL DEFAULT '',
    "invoiceEmail" TEXT NOT NULL DEFAULT '',
    "representativeName" TEXT NOT NULL DEFAULT '',
    "representativeTitle" TEXT NOT NULL DEFAULT '',
    "executorName" TEXT NOT NULL DEFAULT '',
    "executorTitle" TEXT NOT NULL DEFAULT '',
    "ownerId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'dang_dung',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerContact" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CustomerContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerBankAccount" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerBankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "location" TEXT NOT NULL DEFAULT '',
    "venture" TEXT NOT NULL DEFAULT '',
    "bidPackage" TEXT NOT NULL DEFAULT '',
    "startedOn" TEXT NOT NULL DEFAULT '',
    "endedOn" TEXT NOT NULL DEFAULT '',
    "vatPercent" INTEGER,
    "ownerId" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "stage" TEXT NOT NULL DEFAULT 'dang_khao_sat',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldSupplyRequest" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "neededOn" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'da_gui',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FieldSupplyRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldSupplyRequestLine" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "materialId" TEXT NOT NULL DEFAULT '',
    "materialCode" TEXT NOT NULL DEFAULT '',
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "quantityMilli" INTEGER NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "FieldSupplyRequestLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldProgressReport" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reportedOn" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FieldProgressReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldProgressLine" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "spec" TEXT NOT NULL DEFAULT '',
    "unit" TEXT NOT NULL,
    "plannedMilli" INTEGER NOT NULL,
    "doneMilli" INTEGER NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "FieldProgressLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectItem" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "symbol" TEXT NOT NULL DEFAULT '',
    "name" TEXT NOT NULL,
    "spec" TEXT NOT NULL DEFAULT '',
    "unit" TEXT NOT NULL,
    "quantityMilli" INTEGER NOT NULL DEFAULT 0,
    "unitPrice" INTEGER NOT NULL DEFAULT 0,
    "ownerId" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectCost" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "occurredOn" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "payerId" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectCost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectDocument" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "storage" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectOrder" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "partnerId" TEXT,
    "supplierName" TEXT NOT NULL DEFAULT '',
    "supplierAddress" TEXT NOT NULL DEFAULT '',
    "supplierPhone" TEXT NOT NULL DEFAULT '',
    "supplierBankName" TEXT NOT NULL DEFAULT '',
    "supplierAccountNumber" TEXT NOT NULL DEFAULT '',
    "supplierWebsite" TEXT NOT NULL DEFAULT '',
    "supplierEmail" TEXT NOT NULL DEFAULT '',
    "supplierTaxCode" TEXT NOT NULL DEFAULT '',
    "supplierRepresentativeName" TEXT NOT NULL DEFAULT '',
    "supplierRepresentativeTitle" TEXT NOT NULL DEFAULT '',
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'cho_xem',
    "fileName" TEXT NOT NULL DEFAULT '',
    "storedName" TEXT NOT NULL DEFAULT '',
    "fileStore" TEXT NOT NULL DEFAULT '',
    "fileHash" TEXT NOT NULL DEFAULT '',
    "headerNote" TEXT NOT NULL DEFAULT '',
    "vatMode" TEXT NOT NULL DEFAULT 'khong_ro',
    "vatInline" BOOLEAN NOT NULL DEFAULT false,
    "vatTongDaTinh" BOOLEAN NOT NULL DEFAULT false,
    "vatTongTien" INTEGER NOT NULL DEFAULT 0,
    "vatEvidence" TEXT NOT NULL DEFAULT '',
    "depositPercentBps" INTEGER NOT NULL DEFAULT 0,
    "depositAmount" INTEGER NOT NULL DEFAULT 0,
    "depositNote" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectOrderSurcharge" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "quantityMilli" INTEGER NOT NULL DEFAULT 1000,
    "unitPrice" INTEGER NOT NULL DEFAULT 0,
    "taxBps" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProjectOrderSurcharge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectOrderLine" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "materialId" TEXT,
    "materialCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "spec" TEXT NOT NULL DEFAULT '',
    "unit" TEXT NOT NULL DEFAULT '',
    "colorCode" TEXT NOT NULL DEFAULT '',
    "barCount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lengthMm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gramsPerMeter" INTEGER NOT NULL DEFAULT 0,
    "totalGrams" INTEGER NOT NULL DEFAULT 0,
    "quantityMilli" INTEGER NOT NULL DEFAULT 0,
    "unitPrice" INTEGER NOT NULL DEFAULT 0,
    "taxBps" INTEGER NOT NULL DEFAULT 0,
    "nguon" TEXT NOT NULL DEFAULT 'pdf',

    CONSTRAINT "ProjectOrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quotation" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Quotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuotationVersion" (
    "id" TEXT NOT NULL,
    "quotationId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "sourceVersionId" TEXT,
    "copiedFromVersionId" TEXT,
    "changeReason" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL DEFAULT '',
    "quoteDate" TEXT NOT NULL,
    "validUntil" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "scheduleText" TEXT NOT NULL DEFAULT '',
    "paymentTerms" TEXT NOT NULL DEFAULT '',
    "deliveryTerms" TEXT NOT NULL DEFAULT '',
    "warrantyTerms" TEXT NOT NULL DEFAULT '',
    "includedScope" TEXT NOT NULL DEFAULT '',
    "excludedScope" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "quoteNote" TEXT NOT NULL DEFAULT '',
    "customerName" TEXT NOT NULL DEFAULT '',
    "customerTaxCode" TEXT NOT NULL DEFAULT '',
    "customerAddress" TEXT NOT NULL DEFAULT '',
    "customerPhone" TEXT NOT NULL DEFAULT '',
    "customerEmail" TEXT NOT NULL DEFAULT '',
    "customerRepresentativeName" TEXT NOT NULL DEFAULT '',
    "customerRepresentativeTitle" TEXT NOT NULL DEFAULT '',
    "projectName" TEXT NOT NULL DEFAULT '',
    "projectLocation" TEXT NOT NULL DEFAULT '',
    "companyName" TEXT NOT NULL DEFAULT '',
    "companyTaxCode" TEXT NOT NULL DEFAULT '',
    "companyAddress" TEXT NOT NULL DEFAULT '',
    "companyPhone" TEXT NOT NULL DEFAULT '',
    "companyEmail" TEXT NOT NULL DEFAULT '',
    "representativeName" TEXT NOT NULL DEFAULT '',
    "representativeTitle" TEXT NOT NULL DEFAULT '',
    "taxBps" INTEGER NOT NULL DEFAULT 1000,
    "warrantyMonths" INTEGER NOT NULL DEFAULT 0,
    "advanceAmount" INTEGER NOT NULL DEFAULT 0,
    "advanceDays" INTEGER NOT NULL DEFAULT 0,
    "paymentDays" INTEGER NOT NULL DEFAULT 0,
    "internalStatus" TEXT NOT NULL DEFAULT 'nhap',
    "customerStatus" TEXT NOT NULL DEFAULT 'chua_gui',
    "acceptedOn" TEXT,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuotationVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuotationItem" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "sourceItemId" TEXT,
    "sortOrder" INTEGER NOT NULL,
    "groupKey" TEXT NOT NULL,
    "positionCode" TEXT NOT NULL DEFAULT '',
    "name" TEXT NOT NULL,
    "spec" TEXT NOT NULL DEFAULT '',
    "unit" TEXT NOT NULL DEFAULT 'bộ',
    "calcMethod" TEXT NOT NULL,
    "widthMm" INTEGER,
    "heightMm" INTEGER,
    "lengthMm" INTEGER,
    "quantity" INTEGER NOT NULL,
    "areaOverrideMilli" INTEGER,
    "mainUnitPrice" INTEGER NOT NULL,
    "accessorySeparate" BOOLEAN NOT NULL DEFAULT false,
    "accessoryUnitPrice" INTEGER NOT NULL DEFAULT 0,
    "discountMode" TEXT NOT NULL DEFAULT 'khong',
    "discountBps" INTEGER NOT NULL DEFAULT 0,
    "discountAmount" INTEGER NOT NULL DEFAULT 0,
    "taxMode" TEXT NOT NULL,
    "taxBps" INTEGER NOT NULL DEFAULT 0,
    "mainAmount" INTEGER NOT NULL,
    "accessoryAmount" INTEGER NOT NULL,
    "discountValue" INTEGER NOT NULL,
    "pretax" INTEGER NOT NULL,
    "taxAmount" INTEGER,
    "posttax" INTEGER NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "QuotationItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuotationApproval" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuotationApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuotationDelivery" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorId" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "QuotationDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuotationResponse" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "occurredOn" TEXT NOT NULL,
    "confirmerName" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "replacesId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuotationResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteCategoryGroup" (
    "id" TEXT NOT NULL,
    "parentId" TEXT,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuoteCategoryGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteCategory" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'bộ',
    "unitPrice" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuoteCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "sheetName" TEXT NOT NULL DEFAULT '2212',
    "active" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuoteTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobTitle" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobTitle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Position" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "signedNumber" TEXT NOT NULL DEFAULT '',
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "quotationVersionId" TEXT,
    "internalStatus" TEXT NOT NULL DEFAULT 'nhap',
    "signStatus" TEXT NOT NULL DEFAULT 'chua_ky',
    "effectStatus" TEXT NOT NULL DEFAULT 'chua_hieu_luc',
    "executionStatus" TEXT NOT NULL DEFAULT 'chua_trien_khai',
    "priceBasis" TEXT NOT NULL DEFAULT 'chua_xac_nhan',
    "signedOn" TEXT,
    "effectiveOn" TEXT,
    "ownerId" TEXT NOT NULL,
    "declaredSignedTotal" INTEGER,
    "declaredAdminTotal" INTEGER,
    "scopeText" TEXT NOT NULL DEFAULT '',
    "paymentText" TEXT NOT NULL DEFAULT '',
    "warrantyText" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractLine" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "parentId" TEXT,
    "kind" TEXT NOT NULL,
    "code" TEXT NOT NULL DEFAULT '',
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'bộ',
    "widthMm" INTEGER,
    "heightMm" INTEGER,
    "quantity" INTEGER,
    "signedUnitPrice" INTEGER,
    "adminUnitPrice" INTEGER,
    "taxBps" INTEGER,
    "sortOrder" INTEGER NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "ContractLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractMilestone" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "planOn" TEXT,
    "actualOn" TEXT,
    "note" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "ContractMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractPayment" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "basis" TEXT NOT NULL DEFAULT 'chua_xac_nhan',
    "amount" INTEGER,
    "percentBps" INTEGER,
    "note" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "ContractPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractChange" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "lineId" TEXT,
    "title" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "deltaQuantity" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'nhap',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partner" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL DEFAULT '',
    "taxCode" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "website" TEXT NOT NULL DEFAULT '',
    "bankName" TEXT NOT NULL DEFAULT '',
    "accountNumber" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "representativeName" TEXT NOT NULL DEFAULT '',
    "representativeTitle" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'dang_dung',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerRole" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "role" TEXT NOT NULL,

    CONSTRAINT "PartnerRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerContact" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PartnerContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "groupName" TEXT NOT NULL,
    "supplierCode" TEXT NOT NULL DEFAULT '',
    "supplierItemCode" TEXT NOT NULL DEFAULT '',
    "otherCode" TEXT NOT NULL DEFAULT '',
    "spec" TEXT NOT NULL DEFAULT '',
    "color" TEXT NOT NULL DEFAULT '',
    "stockUnit" TEXT NOT NULL,
    "priceBasis" TEXT NOT NULL,
    "barLengthMm" INTEGER,
    "gramsPerMeter" INTEGER,
    "gramsPerBar" INTEGER,
    "taxBps" INTEGER NOT NULL DEFAULT 0,
    "referencePrice" INTEGER,
    "invoiceName" TEXT NOT NULL DEFAULT '',
    "nature" TEXT NOT NULL DEFAULT 'vat_tu',
    "note" TEXT NOT NULL DEFAULT '',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockSlip" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'nhap',
    "slipNo" TEXT NOT NULL DEFAULT '',
    "partnerId" TEXT,
    "projectId" TEXT,
    "orderId" TEXT,
    "fabricationContractId" TEXT,
    "fromKind" TEXT NOT NULL DEFAULT '',
    "fromRef" TEXT NOT NULL DEFAULT '',
    "toKind" TEXT NOT NULL DEFAULT '',
    "toRef" TEXT NOT NULL DEFAULT '',
    "reason" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "expectedAt" TIMESTAMP(3),
    "revision" INTEGER NOT NULL DEFAULT 1,
    "postedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockSlip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkshopContact" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkshopContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockSlipPhoto" (
    "id" TEXT NOT NULL,
    "slipId" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockSlipPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockSlipLine" (
    "id" TEXT NOT NULL,
    "slipId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "documentQty" INTEGER NOT NULL,
    "receivedQty" INTEGER NOT NULL,
    "receiveState" TEXT NOT NULL DEFAULT '',
    "barCount" INTEGER NOT NULL DEFAULT 0,
    "lengthMm" INTEGER,
    "invoiceGrams" INTEGER NOT NULL DEFAULT 0,
    "weighedGrams" INTEGER NOT NULL DEFAULT 0,
    "theoryGrams" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT NOT NULL DEFAULT '',
    "orderLineId" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "StockSlipLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMove" (
    "id" TEXT NOT NULL,
    "slipId" TEXT NOT NULL,
    "lineId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "placeKind" TEXT NOT NULL,
    "placeRef" TEXT NOT NULL DEFAULT '',
    "direction" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMove_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FabricationContract" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'nhap',
    "signedOn" TEXT NOT NULL DEFAULT '',
    "taxBps" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT NOT NULL DEFAULT '',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FabricationContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FabricationLine" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'm2',
    "widthMm" INTEGER NOT NULL DEFAULT 0,
    "heightMm" INTEGER NOT NULL DEFAULT 0,
    "quantityMilli" INTEGER NOT NULL DEFAULT 0,
    "areaMilli" INTEGER NOT NULL DEFAULT 0,
    "areaOverrideMilli" INTEGER,
    "unitPrice" INTEGER NOT NULL DEFAULT 0,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "taxBps" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "FabricationLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FabricationAdvance" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "occurredOn" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "payerId" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FabricationAdvance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportContract" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "pricingKind" TEXT NOT NULL DEFAULT 'theo_chuyen',
    "status" TEXT NOT NULL DEFAULT 'nhap',
    "signedOn" TEXT NOT NULL DEFAULT '',
    "unitPrice" INTEGER,
    "note" TEXT NOT NULL DEFAULT '',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportLine" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "routeText" TEXT NOT NULL DEFAULT '',
    "unit" TEXT NOT NULL DEFAULT 'chuyến',
    "quantityMilli" INTEGER NOT NULL DEFAULT 0,
    "unitPrice" INTEGER NOT NULL DEFAULT 0,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "TransportLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportAdvance" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "occurredOn" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "payerId" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransportAdvance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectSharedCost" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rateBps" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectSharedCost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "href" TEXT NOT NULL DEFAULT '',
    "kind" TEXT NOT NULL DEFAULT 'giao',
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Staff_departmentId_idx" ON "Staff"("departmentId");

-- CreateIndex
CREATE INDEX "Staff_positionId_idx" ON "Staff"("positionId");

-- CreateIndex
CREATE INDEX "Staff_active_idx" ON "Staff"("active");

-- CreateIndex
CREATE UNIQUE INDEX "LoginAccount_username_key" ON "LoginAccount"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE INDEX "UserRole_roleId_idx" ON "UserRole"("roleId");

-- CreateIndex
CREATE INDEX "CompanyBankAccount_profileId_idx" ON "CompanyBankAccount"("profileId");

-- CreateIndex
CREATE INDEX "CompanyProfileFile_profileId_idx" ON "CompanyProfileFile"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "CodeSequence_key_year_key" ON "CodeSequence"("key", "year");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_code_key" ON "Customer"("code");

-- CreateIndex
CREATE INDEX "Customer_ownerId_idx" ON "Customer"("ownerId");

-- CreateIndex
CREATE INDEX "Customer_status_idx" ON "Customer"("status");

-- CreateIndex
CREATE INDEX "Customer_taxCode_idx" ON "Customer"("taxCode");

-- CreateIndex
CREATE INDEX "CustomerContact_customerId_idx" ON "CustomerContact"("customerId");

-- CreateIndex
CREATE INDEX "CustomerBankAccount_customerId_idx" ON "CustomerBankAccount"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerBankAccount_customerId_accountNumber_key" ON "CustomerBankAccount"("customerId", "accountNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Project_code_key" ON "Project"("code");

-- CreateIndex
CREATE INDEX "Project_customerId_idx" ON "Project"("customerId");

-- CreateIndex
CREATE INDEX "Project_ownerId_idx" ON "Project"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "FieldSupplyRequest_code_key" ON "FieldSupplyRequest"("code");

-- CreateIndex
CREATE INDEX "FieldSupplyRequest_projectId_idx" ON "FieldSupplyRequest"("projectId");

-- CreateIndex
CREATE INDEX "FieldSupplyRequest_requesterId_idx" ON "FieldSupplyRequest"("requesterId");

-- CreateIndex
CREATE INDEX "FieldSupplyRequest_createdAt_idx" ON "FieldSupplyRequest"("createdAt");

-- CreateIndex
CREATE INDEX "FieldSupplyRequestLine_requestId_idx" ON "FieldSupplyRequestLine"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "FieldProgressReport_code_key" ON "FieldProgressReport"("code");

-- CreateIndex
CREATE INDEX "FieldProgressReport_projectId_idx" ON "FieldProgressReport"("projectId");

-- CreateIndex
CREATE INDEX "FieldProgressReport_reporterId_idx" ON "FieldProgressReport"("reporterId");

-- CreateIndex
CREATE INDEX "FieldProgressReport_createdAt_idx" ON "FieldProgressReport"("createdAt");

-- CreateIndex
CREATE INDEX "FieldProgressLine_reportId_idx" ON "FieldProgressLine"("reportId");

-- CreateIndex
CREATE INDEX "FieldProgressLine_itemId_idx" ON "FieldProgressLine"("itemId");

-- CreateIndex
CREATE INDEX "ProjectItem_projectId_idx" ON "ProjectItem"("projectId");

-- CreateIndex
CREATE INDEX "ProjectItem_ownerId_idx" ON "ProjectItem"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectItem_projectId_sortOrder_key" ON "ProjectItem"("projectId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectCost_code_key" ON "ProjectCost"("code");

-- CreateIndex
CREATE INDEX "ProjectCost_projectId_idx" ON "ProjectCost"("projectId");

-- CreateIndex
CREATE INDEX "ProjectCost_payerId_idx" ON "ProjectCost"("payerId");

-- CreateIndex
CREATE INDEX "ProjectCost_occurredOn_idx" ON "ProjectCost"("occurredOn");

-- CreateIndex
CREATE INDEX "ProjectDocument_projectId_idx" ON "ProjectDocument"("projectId");

-- CreateIndex
CREATE INDEX "ProjectDocument_uploadedById_idx" ON "ProjectDocument"("uploadedById");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectOrder_code_key" ON "ProjectOrder"("code");

-- CreateIndex
CREATE INDEX "ProjectOrder_projectId_idx" ON "ProjectOrder"("projectId");

-- CreateIndex
CREATE INDEX "ProjectOrder_partnerId_idx" ON "ProjectOrder"("partnerId");

-- CreateIndex
CREATE INDEX "ProjectOrder_status_idx" ON "ProjectOrder"("status");

-- CreateIndex
CREATE INDEX "ProjectOrder_projectId_fileHash_idx" ON "ProjectOrder"("projectId", "fileHash");

-- CreateIndex
CREATE INDEX "ProjectOrderSurcharge_orderId_idx" ON "ProjectOrderSurcharge"("orderId");

-- CreateIndex
CREATE INDEX "ProjectOrderLine_orderId_idx" ON "ProjectOrderLine"("orderId");

-- CreateIndex
CREATE INDEX "ProjectOrderLine_materialId_idx" ON "ProjectOrderLine"("materialId");

-- CreateIndex
CREATE UNIQUE INDEX "Quotation_code_key" ON "Quotation"("code");

-- CreateIndex
CREATE INDEX "Quotation_customerId_idx" ON "Quotation"("customerId");

-- CreateIndex
CREATE INDEX "Quotation_projectId_idx" ON "Quotation"("projectId");

-- CreateIndex
CREATE INDEX "QuotationVersion_ownerId_idx" ON "QuotationVersion"("ownerId");

-- CreateIndex
CREATE INDEX "QuotationVersion_internalStatus_idx" ON "QuotationVersion"("internalStatus");

-- CreateIndex
CREATE INDEX "QuotationVersion_customerStatus_idx" ON "QuotationVersion"("customerStatus");

-- CreateIndex
CREATE UNIQUE INDEX "QuotationVersion_quotationId_number_key" ON "QuotationVersion"("quotationId", "number");

-- CreateIndex
CREATE INDEX "QuotationItem_versionId_idx" ON "QuotationItem"("versionId");

-- CreateIndex
CREATE INDEX "QuotationApproval_versionId_idx" ON "QuotationApproval"("versionId");

-- CreateIndex
CREATE INDEX "QuotationDelivery_versionId_idx" ON "QuotationDelivery"("versionId");

-- CreateIndex
CREATE INDEX "QuotationResponse_versionId_idx" ON "QuotationResponse"("versionId");

-- CreateIndex
CREATE INDEX "Attachment_entityType_entityId_idx" ON "Attachment"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "QuoteCategoryGroup_parentId_sortOrder_idx" ON "QuoteCategoryGroup"("parentId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "QuoteCategory_name_key" ON "QuoteCategory"("name");

-- CreateIndex
CREATE INDEX "QuoteCategory_groupId_sortOrder_idx" ON "QuoteCategory"("groupId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "JobTitle_name_key" ON "JobTitle"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Position_name_key" ON "Position"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_code_key" ON "Contract"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_quotationVersionId_key" ON "Contract"("quotationVersionId");

-- CreateIndex
CREATE INDEX "Contract_projectId_idx" ON "Contract"("projectId");

-- CreateIndex
CREATE INDEX "Contract_customerId_idx" ON "Contract"("customerId");

-- CreateIndex
CREATE INDEX "Contract_ownerId_idx" ON "Contract"("ownerId");

-- CreateIndex
CREATE INDEX "ContractLine_contractId_idx" ON "ContractLine"("contractId");

-- CreateIndex
CREATE INDEX "ContractLine_parentId_idx" ON "ContractLine"("parentId");

-- CreateIndex
CREATE INDEX "ContractMilestone_contractId_idx" ON "ContractMilestone"("contractId");

-- CreateIndex
CREATE INDEX "ContractPayment_contractId_idx" ON "ContractPayment"("contractId");

-- CreateIndex
CREATE INDEX "ContractChange_contractId_idx" ON "ContractChange"("contractId");

-- CreateIndex
CREATE UNIQUE INDEX "Partner_code_key" ON "Partner"("code");

-- CreateIndex
CREATE INDEX "Partner_status_idx" ON "Partner"("status");

-- CreateIndex
CREATE INDEX "Partner_taxCode_idx" ON "Partner"("taxCode");

-- CreateIndex
CREATE INDEX "PartnerRole_role_idx" ON "PartnerRole"("role");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerRole_partnerId_role_key" ON "PartnerRole"("partnerId", "role");

-- CreateIndex
CREATE INDEX "PartnerContact_partnerId_idx" ON "PartnerContact"("partnerId");

-- CreateIndex
CREATE UNIQUE INDEX "Material_code_key" ON "Material"("code");

-- CreateIndex
CREATE INDEX "Material_groupName_idx" ON "Material"("groupName");

-- CreateIndex
CREATE INDEX "Material_priceBasis_idx" ON "Material"("priceBasis");

-- CreateIndex
CREATE UNIQUE INDEX "StockSlip_code_key" ON "StockSlip"("code");

-- CreateIndex
CREATE INDEX "StockSlip_kind_idx" ON "StockSlip"("kind");

-- CreateIndex
CREATE INDEX "StockSlip_status_idx" ON "StockSlip"("status");

-- CreateIndex
CREATE INDEX "StockSlip_projectId_idx" ON "StockSlip"("projectId");

-- CreateIndex
CREATE INDEX "StockSlip_partnerId_idx" ON "StockSlip"("partnerId");

-- CreateIndex
CREATE INDEX "StockSlip_orderId_idx" ON "StockSlip"("orderId");

-- CreateIndex
CREATE INDEX "StockSlip_fabricationContractId_idx" ON "StockSlip"("fabricationContractId");

-- CreateIndex
CREATE INDEX "StockSlipPhoto_slipId_idx" ON "StockSlipPhoto"("slipId");

-- CreateIndex
CREATE INDEX "StockSlipLine_slipId_idx" ON "StockSlipLine"("slipId");

-- CreateIndex
CREATE INDEX "StockSlipLine_materialId_idx" ON "StockSlipLine"("materialId");

-- CreateIndex
CREATE INDEX "StockMove_materialId_placeKind_placeRef_idx" ON "StockMove"("materialId", "placeKind", "placeRef");

-- CreateIndex
CREATE INDEX "StockMove_slipId_idx" ON "StockMove"("slipId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "FabricationContract_code_key" ON "FabricationContract"("code");

-- CreateIndex
CREATE INDEX "FabricationContract_projectId_idx" ON "FabricationContract"("projectId");

-- CreateIndex
CREATE INDEX "FabricationContract_partnerId_idx" ON "FabricationContract"("partnerId");

-- CreateIndex
CREATE INDEX "FabricationContract_status_idx" ON "FabricationContract"("status");

-- CreateIndex
CREATE INDEX "FabricationLine_contractId_idx" ON "FabricationLine"("contractId");

-- CreateIndex
CREATE INDEX "FabricationAdvance_contractId_idx" ON "FabricationAdvance"("contractId");

-- CreateIndex
CREATE UNIQUE INDEX "TransportContract_code_key" ON "TransportContract"("code");

-- CreateIndex
CREATE INDEX "TransportContract_projectId_idx" ON "TransportContract"("projectId");

-- CreateIndex
CREATE INDEX "TransportContract_partnerId_idx" ON "TransportContract"("partnerId");

-- CreateIndex
CREATE INDEX "TransportContract_status_idx" ON "TransportContract"("status");

-- CreateIndex
CREATE INDEX "TransportLine_contractId_idx" ON "TransportLine"("contractId");

-- CreateIndex
CREATE INDEX "TransportAdvance_contractId_idx" ON "TransportAdvance"("contractId");

-- CreateIndex
CREATE INDEX "ProjectSharedCost_projectId_idx" ON "ProjectSharedCost"("projectId");

-- CreateIndex
CREATE INDEX "Notice_userId_createdAt_idx" ON "Notice"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoginAccount" ADD CONSTRAINT "LoginAccount_id_fkey" FOREIGN KEY ("id") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyBankAccount" ADD CONSTRAINT "CompanyBankAccount_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CompanyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyProfileFile" ADD CONSTRAINT "CompanyProfileFile_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CompanyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerContact" ADD CONSTRAINT "CustomerContact_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerBankAccount" ADD CONSTRAINT "CustomerBankAccount_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldSupplyRequest" ADD CONSTRAINT "FieldSupplyRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldSupplyRequestLine" ADD CONSTRAINT "FieldSupplyRequestLine_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "FieldSupplyRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldProgressReport" ADD CONSTRAINT "FieldProgressReport_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldProgressLine" ADD CONSTRAINT "FieldProgressLine_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "FieldProgressReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectItem" ADD CONSTRAINT "ProjectItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCost" ADD CONSTRAINT "ProjectCost_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDocument" ADD CONSTRAINT "ProjectDocument_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectOrder" ADD CONSTRAINT "ProjectOrder_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectOrder" ADD CONSTRAINT "ProjectOrder_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectOrderSurcharge" ADD CONSTRAINT "ProjectOrderSurcharge_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ProjectOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectOrderLine" ADD CONSTRAINT "ProjectOrderLine_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ProjectOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationVersion" ADD CONSTRAINT "QuotationVersion_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationItem" ADD CONSTRAINT "QuotationItem_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "QuotationVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationApproval" ADD CONSTRAINT "QuotationApproval_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "QuotationVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationDelivery" ADD CONSTRAINT "QuotationDelivery_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "QuotationVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationResponse" ADD CONSTRAINT "QuotationResponse_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "QuotationVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteCategoryGroup" ADD CONSTRAINT "QuoteCategoryGroup_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "QuoteCategoryGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteCategory" ADD CONSTRAINT "QuoteCategory_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "QuoteCategoryGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_quotationVersionId_fkey" FOREIGN KEY ("quotationVersionId") REFERENCES "QuotationVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractLine" ADD CONSTRAINT "ContractLine_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractLine" ADD CONSTRAINT "ContractLine_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ContractLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractMilestone" ADD CONSTRAINT "ContractMilestone_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractPayment" ADD CONSTRAINT "ContractPayment_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractChange" ADD CONSTRAINT "ContractChange_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerRole" ADD CONSTRAINT "PartnerRole_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerContact" ADD CONSTRAINT "PartnerContact_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockSlip" ADD CONSTRAINT "StockSlip_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockSlip" ADD CONSTRAINT "StockSlip_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockSlip" ADD CONSTRAINT "StockSlip_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ProjectOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockSlip" ADD CONSTRAINT "StockSlip_fabricationContractId_fkey" FOREIGN KEY ("fabricationContractId") REFERENCES "FabricationContract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockSlipPhoto" ADD CONSTRAINT "StockSlipPhoto_slipId_fkey" FOREIGN KEY ("slipId") REFERENCES "StockSlip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockSlipLine" ADD CONSTRAINT "StockSlipLine_slipId_fkey" FOREIGN KEY ("slipId") REFERENCES "StockSlip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockSlipLine" ADD CONSTRAINT "StockSlipLine_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMove" ADD CONSTRAINT "StockMove_slipId_fkey" FOREIGN KEY ("slipId") REFERENCES "StockSlip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMove" ADD CONSTRAINT "StockMove_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FabricationContract" ADD CONSTRAINT "FabricationContract_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FabricationContract" ADD CONSTRAINT "FabricationContract_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FabricationLine" ADD CONSTRAINT "FabricationLine_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "FabricationContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FabricationAdvance" ADD CONSTRAINT "FabricationAdvance_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "FabricationContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportContract" ADD CONSTRAINT "TransportContract_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportContract" ADD CONSTRAINT "TransportContract_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportLine" ADD CONSTRAINT "TransportLine_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "TransportContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportAdvance" ADD CONSTRAINT "TransportAdvance_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "TransportContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectSharedCost" ADD CONSTRAINT "ProjectSharedCost_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
