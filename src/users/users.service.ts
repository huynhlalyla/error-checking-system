import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async create(dto: CreateUserDto): Promise<UserDocument> {
    const exists = await this.userModel.findOne({ username: dto.username });
    if (exists) throw new ConflictException('Username already exists');

    const isDevice = dto.role === 'device';
    const pwd = dto.password || (isDevice ? uuidv4() : '123456');
    const passwordHash = await bcrypt.hash(pwd, 10);
    const apiKey = isDevice ? uuidv4() : undefined;

    const user = new this.userModel({
      username: dto.username,
      passwordHash,
      role: dto.role ?? 'inspector',
      apiKey,
      expiresAt: dto.expiresAt || null,
    });

    return user.save();
  }

  async findAll(): Promise<UserDocument[]> {
    return this.userModel.find({}, { passwordHash: 0 }).exec();
  }

  async findById(id: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id, { passwordHash: 0 });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByUsername(username: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ username }).exec();
  }

  async findByApiKey(apiKey: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ apiKey }).exec();
  }

  async remove(id: string): Promise<void> {
    const result = await this.userModel.findByIdAndDelete(id);
    if (!result) throw new NotFoundException('User not found');
  }

  async toggleFreeze(id: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id);
    if (!user) throw new NotFoundException('User not found');
    user.isFrozen = !user.isFrozen;
    return user.save();
  }

  async extendExpiration(id: string, expiresAt: Date | null): Promise<UserDocument> {
    const user = await this.userModel.findById(id);
    if (!user) throw new NotFoundException('User not found');
    user.expiresAt = expiresAt;
    user.isFrozen = false; // Auto unfreeze if extended
    return user.save();
  }
}
