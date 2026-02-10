from PIL import Image, ImageDraw, ImageOps
import sys

def make_squircle(image_path, output_path, radius_ratio=0.22):
    try:
        # Load image
        img = Image.open(image_path).convert("RGBA")
        
        # Create mask
        mask = Image.new("L", img.size, 0)
        draw = ImageDraw.Draw(mask)
        
        width, height = img.size
        radius = min(width, height) * radius_ratio
        
        # Draw rounded rectangle (squircle approximation)
        draw.rounded_rectangle([(0, 0), (width, height)], radius=radius, fill=255)
        
        # Apply mask
        result = ImageOps.fit(img, mask.size, centering=(0.5, 0.5))
        result.putalpha(mask)
        
        # Save output
        result.save(output_path, "PNG")
        print(f"Successfully processed icon: {output_path}")
        
    except Exception as e:
        print(f"Error processing icon: {e}")
        sys.exit(1)

if __name__ == "__main__":
    make_squircle("public/icon.png", "public/icon.png")
