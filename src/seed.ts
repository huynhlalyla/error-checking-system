import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UsersService } from './users/users.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);

  try {
    const admin = await usersService.findByUsername('admin');
    if (admin) {
      console.log('Admin account already exists.');
    } else {
      await usersService.create({
        username: 'admin',
        password: 'password123',
        role: 'admin',
      });
      console.log('Admin account created: username=admin, password=password123');
    }
  } catch (error) {
    console.error('Error seeding admin account:', error);
  } finally {
    await app.close();
  }
}
bootstrap();
