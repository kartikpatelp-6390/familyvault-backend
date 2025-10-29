import { Controller, Post, Get, Delete, Put, Req, Param, Body, UploadedFile, UseGuards, UseInterceptors, Res } from '@nestjs/common';
import { DocumentService } from './document.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { UpdateDocumentAccessDto } from './dto/update-document-access.dto';
import type { Express, Response } from 'express';
import { Permissions } from '../common/decorators/permissions.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('documents')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Permissions({ module_key: 'documents', action: 'create' })
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@Req() req, @UploadedFile() file: Express.Multer.File, @Body() dto: UploadDocumentDto) {
    const tenantId = req.user.tenantId;
    const uploaderId = req.user.sub;
    return this.documentService.uploadDocument(req.tenantConn, tenantId, file, dto, uploaderId);
  }

  @Permissions({ module_key: 'documents', action: 'read' })
  @Get()
  async listAll(@Req() req) {
    return this.documentService.getDocuments(req.tenantConn);
  }

  @Get('usage')
  async getTenantUsage(@Req() req) {
    return this.documentService.getTenantUsage(req.user.tenantId);
  }

  @Permissions({ module_key: 'documents', action: 'delete' })
  @Delete(':id')
  async delete(@Req() req, @Param('id') id: string) {
    return this.documentService.deleteDocument(req.tenantConn, req.user.tenantId, id);
  }

  @Put(':id/access')
  async updateAccess(@Req() req, @Param('id') id: string, @Body() dto: UpdateDocumentAccessDto) {
    const requesterMemberId = req.user.sub;
    return this.documentService.updateAccess(req.tenantConn, id, dto, requesterMemberId);
  }

  @Get('download/:id')
  async downloadDocument(
    @Req() req,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const tenantId = req.user.tenantId;
    const requesterMemberId = req.user.sub;
    const response = await this.documentService.downloadDocument(req.tenantConn, tenantId, id, requesterMemberId);

    const filePath = response.fileInfo.absolutePath;
    const fileName = response.document.fileName;
    const mimeType = response.document.mimeType || 'application/octet-stream';


    // Send the file directly for browser download
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(fileName)}"`,
    );
    res.setHeader('Content-Type', mimeType);

    res.sendFile(filePath);
  }

  @Get('stats')
  async getDocStat(@Req() req) {
      return this.documentService.getStats(req.tenantConn);
  }
}
